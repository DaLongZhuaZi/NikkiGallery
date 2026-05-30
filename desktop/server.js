const express = require('express');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const kill = require('tree-kill');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const PORT = 19527;
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 服务配置 — 所有服务统一管理
const SERVICE_CONFIG = {
  server: { name: '后端服务', port: 14000, dir: 'server', readyKeywords: ['Server running', 'listening on'] },
  client: { name: '前端服务', port: 13000, dir: 'client', readyKeywords: ['ready', 'Local:', 'localhost'] },
  aiService: { name: 'AI 服务', port: 15000, dir: 'ai-service', readyKeywords: ['AI Service running', 'running on port'] }
};

// 服务运行时状态
const services = {};
for (const [key, config] of Object.entries(SERVICE_CONFIG)) {
  services[key] = { process: null, status: 'stopped', logs: [], port: config.port, retryCount: 0 };
}

const MAX_RETRIES = 3;
const MAX_LOGS = 500;

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// WebSocket 服务器
const server = app.listen(PORT, () => {
  console.log(`🎮 NikkiGallery 管理面板已启动: http://localhost:${PORT}`);
  console.log(`   管理服务: ${Object.values(SERVICE_CONFIG).map(s => `${s.name}(:${s.port})`).join(', ')}`);
});

const wss = new WebSocket.Server({ server });

// 广播消息到所有客户端
function broadcast(type, data) {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// 剥离 ANSI 转义码
function stripAnsi(str) {
  return str.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]/g,
    ''
  );
}

// 添加日志
function addLog(service, message, type = 'info') {
  const log = {
    time: new Date().toLocaleTimeString(),
    message: stripAnsi(message),
    type
  };
  services[service].logs.push(log);
  if (services[service].logs.length > MAX_LOGS) {
    services[service].logs = services[service].logs.slice(-MAX_LOGS);
  }
  broadcast('log', { service, log });
}

// 获取服务状态
function getServiceStatus(service) {
  const config = SERVICE_CONFIG[service];
  return {
    key: service,
    name: config.name,
    port: services[service].port,
    status: services[service].status,
    external: !!services[service].external,
    logCount: services[service].logs.length
  };
}

// 检查端口是否被占用
function isPortInUse(port) {
  return new Promise((resolve) => {
    try {
      if (process.platform === 'win32') {
        const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf-8' });
        resolve(!!output.trim());
      } else {
        const output = execSync(`lsof -i :${port} | grep LISTEN`, { encoding: 'utf-8' });
        resolve(!!output.trim());
      }
    } catch {
      resolve(false);
    }
  });
}

// 检查端口上的服务是否健康响应
function checkServiceHealth(port, timeout = 3000) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, { timeout }, (res) => {
      resolve(res.statusCode < 500);
      req.destroy();
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// 检查端口占用并杀死进程
// 轮询检查端口是否空闲
function waitForPortFree(port, maxWaitMs = 5000, intervalMs = 500) {
  const isWindows = process.platform === 'win32';
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      try {
        if (isWindows) {
          execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf-8', stdio: 'pipe' });
        } else {
          execSync(`lsof -i :${port} | grep LISTEN`, { encoding: 'utf-8', stdio: 'pipe' });
        }
        // 端口仍被占用
        if (Date.now() - startTime >= maxWaitMs) {
          reject(new Error(`等待端口 ${port} 释放超时 (${maxWaitMs}ms)`));
        } else {
          setTimeout(check, intervalMs);
        }
      } catch (e) {
        // 端口已释放
        resolve(true);
      }
    };
    check();
  });
}

function killPortProcess(port) {
  return new Promise((resolve, reject) => {
    try {
      if (process.platform === 'win32') {
        // 查找占用端口的进程
        let pids = [];
        try {
          const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf-8' });
          const lines = output.trim().split('\n').filter(l => l.trim());
          lines.forEach(line => {
            const match = line.match(/\s+(\d+)\s*$/);
            if (match && match[1] !== '0') {
              pids.push(match[1]);
            }
          });
        } catch (e) {
          // netstat 没有找到匹配，端口未被占用
          resolve(true);
          return;
        }

        if (pids.length === 0) {
          resolve(true);
          return;
        }

        console.log(`[killPort] 端口 ${port} 被进程 ${pids.join(', ')} 占用，正在终止...`);

        // 逐个杀死进程，优先用 tree-kill（无需管理员权限），失败后依次尝试多种方式
        pids.forEach(pid => {
          let killed = false;

          // 方式1: tree-kill（无需管理员权限，适用于自管进程）
          try {
            kill(parseInt(pid), 'SIGTERM');
            console.log(`[killPort] tree-kill SIGTERM 已发送到 PID ${pid}`);
            killed = true;
          } catch (e) {
            // tree-kill 失败，继续尝试其他方式
          }

          // 方式2: taskkill（不带 /F，优雅终止）
          if (!killed) {
            try {
              execSync(`taskkill /PID ${pid}`, { encoding: 'utf-8', stdio: 'pipe' });
              console.log(`[killPort] taskkill 已发送到 PID ${pid}`);
              killed = true;
            } catch (e) {
              // 继续
            }
          }

          // 方式3: taskkill /F（强制终止，可能需要管理员权限）
          if (!killed) {
            try {
              execSync(`taskkill /F /PID ${pid}`, { encoding: 'utf-8', stdio: 'pipe' });
              console.log(`[killPort] taskkill /F 已发送到 PID ${pid}`);
              killed = true;
            } catch (e) {
              console.warn(`[killPort] taskkill /F 杀死 PID ${pid} 失败: ${e.message}`);
            }
          }

          // 方式4: PowerShell Stop-Process（不同的权限模型）
          if (!killed) {
            try {
              execSync(`powershell -NoProfile -Command "Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue"`, { encoding: 'utf-8', stdio: 'pipe' });
              console.log(`[killPort] PowerShell Stop-Process 已发送到 PID ${pid}`);
              killed = true;
            } catch (e) {
              console.warn(`[killPort] PowerShell 杀死 PID ${pid} 失败: ${e.message}`);
            }
          }

          // 方式5: wmic（最后手段）
          if (!killed) {
            try {
              execSync(`wmic process where processid=${pid} delete`, { encoding: 'utf-8', stdio: 'pipe' });
              console.log(`[killPort] wmic 已删除 PID ${pid}`);
              killed = true;
            } catch (e) {
              console.error(`[killPort] 所有方式均无法杀死 PID ${pid}: ${e.message}`);
            }
          }
        });

        // 轮询等待端口释放（最多 8 秒，每 500ms 检查一次）
        waitForPortFree(port, 8000, 500)
          .then(() => {
            console.log(`[killPort] 端口 ${port} 已成功释放`);
            resolve(true);
          })
          .catch(err => {
            console.error(`[killPort] ${err.message}`);
            reject(err);
          });
      } else {
        // Linux/macOS
        try {
          execSync(`lsof -ti :${port} | xargs kill -9`, { encoding: 'utf-8', stdio: 'pipe' });
          console.log(`已终止占用端口 ${port} 的进程`);
        } catch (e) {
          // 端口可能未被占用
        }
        waitForPortFree(port, 3000, 500).then(resolve).catch(reject);
      }
    } catch (e) {
      reject(e);
    }
  });
}

// 启动服务
async function startService(service) {
  if (services[service].process) {
    addLog(service, '服务已在运行中', 'warn');
    return false;
  }

  const config = SERVICE_CONFIG[service];
  const port = services[service].port;
  const cwd = path.join(PROJECT_ROOT, config.dir);

  // 检查 node_modules 是否存在，不存在则自动安装
  if (!fs.existsSync(path.join(cwd, 'node_modules'))) {
    addLog(service, '首次运行，正在安装依赖...', 'info');
    try {
      execSync('npm install', { cwd, stdio: 'pipe', encoding: 'utf-8' });
      addLog(service, '依赖安装完成', 'info');
    } catch (err) {
      addLog(service, `依赖安装失败: ${err.message}`, 'error');
      services[service].status = 'error';
      broadcast('status', getServiceStatus(service));
      return false;
    }
  }

  // 先检查端口是否已被占用
  const portBusy = await isPortInUse(port);
  if (portBusy) {
    addLog(service, `端口 ${port} 已被占用，尝试清理...`, 'warn');

    // 尝试杀死占用端口的进程
    try {
      await killPortProcess(port);
      addLog(service, `端口 ${port} 已清理`, 'info');
    } catch (err) {
      addLog(service, `清理端口失败: ${err.message}（提示: 请以管理员身份运行此程序）`, 'error');
      services[service].status = 'error';
      broadcast('status', getServiceStatus(service));
      return false;
    }

    // 再次确认端口已释放
    const stillBusy = await isPortInUse(port);
    if (stillBusy) {
      addLog(service, `无法清理端口 ${port}，请以管理员身份运行管理面板，或手动关闭占用端口的程序`, 'error');
      services[service].status = 'error';
      broadcast('status', getServiceStatus(service));
      return false;
    }
  }

  // 重置重试计数
  services[service].retryCount = 0;

  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'cmd.exe' : 'npm';
  const args = isWindows ? ['/c', 'npm', 'run', 'dev'] : ['run', 'dev'];

  addLog(service, `正在启动 ${config.name}...`, 'info');

  try {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      stdio: 'pipe',
      env: { ...process.env, FORCE_COLOR: '0' }
    });

    services[service].process = child;
    services[service].status = 'starting';
    broadcast('status', getServiceStatus(service));

    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => {
        addLog(service, line, 'info');

        if (services[service].status === 'starting') {
          const isReady = config.readyKeywords.some(kw => line.includes(kw));
          if (isReady) {
            services[service].status = 'running';
            services[service].retryCount = 0;
            broadcast('status', getServiceStatus(service));
            checkAllServicesRunning();
          }
        }
      });
    });

    child.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => {
        // 检查是否是端口占用错误
        if (line.includes('EADDRINUSE')) {
          services[service].retryCount++;

          if (services[service].retryCount > MAX_RETRIES) {
            addLog(service, `端口 ${port} 持续被占用，已重试 ${MAX_RETRIES} 次，请手动关闭占用该端口的程序`, 'error');
            services[service].status = 'error';
            broadcast('status', getServiceStatus(service));
            // 清理进程
            if (services[service].process) {
              kill(services[service].process.pid, 'SIGTERM');
              services[service].process = null;
            }
            return;
          }

          addLog(service, `端口 ${port} 被占用，正在清理并重试 (${services[service].retryCount}/${MAX_RETRIES})...`, 'warn');
          // 自动重试
          setTimeout(async () => {
            await killPortProcess(port);
            addLog(service, '端口已清理，正在重新启动...', 'info');
            services[service].process = null;
            services[service].status = 'stopped';
            startService(service);
          }, 1500);
          return;
        }
        addLog(service, line, 'error');
      });
    });

    child.on('close', (code) => {
      services[service].process = null;
      services[service].status = 'stopped';
      addLog(service, `服务已停止 (退出码: ${code})`, code === 0 ? 'info' : 'error');
      broadcast('status', getServiceStatus(service));
    });

    child.on('error', (err) => {
      services[service].process = null;
      services[service].status = 'stopped';
      addLog(service, `启动失败: ${err.message}`, 'error');
      broadcast('status', getServiceStatus(service));
    });

    // 超时检测（兜底）
    setTimeout(() => {
      if (services[service].status === 'starting') {
        services[service].status = 'running';
        services[service].retryCount = 0;
        broadcast('status', getServiceStatus(service));
        checkAllServicesRunning();
      }
    }, 8000);

    return true;
  } catch (err) {
    addLog(service, `启动失败: ${err.message}`, 'error');
    return false;
  }
}

// 检查是否所有服务都已启动
let hasOpenedBrowser = false;
function checkAllServicesRunning() {
  if (hasOpenedBrowser) return;

  const allRunning = Object.values(services).every(s => s.status === 'running');
  if (allRunning) {
    hasOpenedBrowser = true;
    setTimeout(() => {
      openBrowser(`http://localhost:${services.client.port}`);
    }, 1000);
  }
}

// 打开浏览器
function openBrowser(url) {
  const { exec } = require('child_process');
  const platform = process.platform;

  let command;
  if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    command = `open "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, (err) => {
    if (err) {
      console.error('打开浏览器失败:', err);
    } else {
      console.log(`已打开浏览器: ${url}`);
    }
  });
}

// 停止服务
async function stopService(service) {
  const child = services[service].process;
  const port = services[service].port;

  // 如果是外部服务（没有 process 对象），尝试通过端口杀死进程
  if (!child && services[service].external) {
    addLog(service, '正在停止外部服务...', 'info');
    try {
      await killPortProcess(port);
      services[service].status = 'stopped';
      services[service].external = false;
      addLog(service, '外部服务已停止', 'info');
      broadcast('status', getServiceStatus(service));
      return true;
    } catch (err) {
      addLog(service, `停止外部服务失败: ${err.message}`, 'error');
      return false;
    }
  }

  if (!child) {
    addLog(service, '服务未在运行', 'warn');
    return false;
  }

  addLog(service, '正在停止服务...', 'info');

  try {
    kill(child.pid, 'SIGTERM', (err) => {
      if (err) {
        addLog(service, `停止失败: ${err.message}`, 'error');
      }
    });
    return true;
  } catch (err) {
    addLog(service, `停止失败: ${err.message}`, 'error');
    return false;
  }
}

// API 路由

// 获取所有服务状态
app.get('/api/status', (req, res) => {
  const result = {};
  for (const key of Object.keys(SERVICE_CONFIG)) {
    result[key] = getServiceStatus(key);
  }
  res.json({ services: result, projectRoot: PROJECT_ROOT });
});

// 获取服务日志
app.get('/api/logs/:service', (req, res) => {
  const { service } = req.params;
  if (!services[service]) {
    return res.status(400).json({ error: 'Invalid service' });
  }
  res.json({ logs: services[service].logs });
});

// 启动单个服务
app.post('/api/start/:service', (req, res) => {
  const { service } = req.params;
  if (!services[service]) {
    return res.status(400).json({ error: 'Invalid service' });
  }
  startService(service);
  res.json({ success: true });
});

// 停止单个服务
app.post('/api/stop/:service', (req, res) => {
  const { service } = req.params;
  if (!services[service]) {
    return res.status(400).json({ error: 'Invalid service' });
  }
  const success = stopService(service);
  res.json({ success });
});

// 重启单个服务
app.post('/api/restart/:service', (req, res) => {
  const { service } = req.params;
  if (!services[service]) {
    return res.status(400).json({ error: 'Invalid service' });
  }
  stopService(service);
  setTimeout(() => startService(service), 1000);
  res.json({ success: true });
});

// 启动全部服务（按依赖顺序：后端 → AI服务 → 前端）
app.post('/api/start-all', (req, res) => {
  hasOpenedBrowser = false;
  startService('server');
  setTimeout(() => startService('aiService'), 2000);
  setTimeout(() => startService('client'), 4000);
  res.json({ success: true });
});

// 停止全部服务
app.post('/api/stop-all', (req, res) => {
  hasOpenedBrowser = false;
  for (const key of Object.keys(SERVICE_CONFIG)) {
    stopService(key);
  }
  res.json({ success: true });
});

// 清空日志
app.delete('/api/logs/:service', (req, res) => {
  const { service } = req.params;
  if (!services[service]) {
    return res.status(400).json({ error: 'Invalid service' });
  }
  services[service].logs = [];
  broadcast('log-clear', { service });
  res.json({ success: true });
});

// 打开前端页面
app.post('/api/open-frontend', (req, res) => {
  const url = `http://localhost:${services.client.port}`;
  openBrowser(url);
  res.json({ success: true, url });
});

// 获取端口配置
app.get('/api/ports', (req, res) => {
  const result = { management: PORT };
  for (const [key, config] of Object.entries(SERVICE_CONFIG)) {
    result[key] = services[key].port;
  }
  res.json(result);
});

// 检查端口占用
app.get('/api/check-ports', (req, res) => {
  const ports = Object.values(services).map(s => s.port);
  ports.push(PORT); // 加上管理面板自身端口
  const results = {};

  ports.forEach(port => {
    try {
      if (process.platform === 'win32') {
        const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf-8' });
        results[port] = { busy: !!output.trim(), pid: output.trim() ? output.match(/\d+$/)?.[0] : null };
      } else {
        const output = execSync(`lsof -i :${port} | grep LISTEN`, { encoding: 'utf-8' });
        results[port] = { busy: !!output.trim(), pid: output.trim() ? output.split(/\s+/)[1] : null };
      }
    } catch {
      results[port] = { busy: false, pid: null };
    }
  });

  res.json(results);
});

// 错误处理
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});

// 优雅关闭 — 停止所有服务
function gracefulShutdown() {
  console.log('\n正在关闭所有服务...');
  for (const key of Object.keys(SERVICE_CONFIG)) {
    stopService(key);
  }
  setTimeout(() => process.exit(0), 2000);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
