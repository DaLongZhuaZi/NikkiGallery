/**
 * 下载 AI 模型文件（带完整性验证）
 * 用法: node scripts/download-models.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '../ai-service/models');

const MODELS = [
  {
    id: 'yolov8-small',
    name: 'YOLOv8 Small',
    urls: [
      'https://hf-mirror.com/Kalray/yolov8/resolve/main/yolov8s.onnx',
      'https://huggingface.co/Kalray/yolov8/resolve/main/yolov8s.onnx',
    ],
    expectedMinSize: 20 * 1024 * 1024, // 20MB minimum
  },
  {
    id: 'resnet18',
    name: 'ResNet-18',
    urls: [
      'https://github.com/onnx/models/raw/main/validated/vision/classification/resnet/model/resnet18-v2-7.onnx',
    ],
    expectedMinSize: 40 * 1024 * 1024, // 40MB minimum
  },
];

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    let downloadedBytes = 0;
    let contentLength = 0;
    let lastReportTime = 0;

    const request = https.get(url, { 
      headers: { 'User-Agent': 'NikkiGallery/1.0' },
      timeout: 300000, // 5 minute timeout
    }, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`HTTP ${response.statusCode}`));
      }

      contentLength = parseInt(response.headers['content-length'] || '0', 10);
      console.log(`  文件大小: ${contentLength > 0 ? (contentLength / 1024 / 1024).toFixed(1) + ' MB' : '未知'}`);

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const now = Date.now();
        if (now - lastReportTime > 2000) {
          lastReportTime = now;
          const percent = contentLength > 0 ? Math.round((downloadedBytes / contentLength) * 100) : 0;
          const downloadedMB = (downloadedBytes / 1024 / 1024).toFixed(1);
          process.stdout.write(`\r  进度: ${percent}% (${downloadedMB} MB)`);
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(''); // newline
        resolve(downloadedBytes);
      });
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });

    request.on('timeout', () => {
      request.destroy();
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(new Error('请求超时'));
    });
  });
}

async function downloadModel(model) {
  const destPath = path.join(MODELS_DIR, `${model.id}.onnx`);
  
  // Check if already exists and valid
  if (fs.existsSync(destPath)) {
    const stat = fs.statSync(destPath);
    if (stat.size >= model.expectedMinSize) {
      console.log(`✓ ${model.name}: 已存在 (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
      return true;
    } else {
      console.log(`⚠ ${model.name}: 文件不完整 (${(stat.size / 1024 / 1024).toFixed(1)} MB)，重新下载...`);
      fs.unlinkSync(destPath);
    }
  }

  console.log(`\n下载 ${model.name}...`);
  
  for (let i = 0; i < model.urls.length; i++) {
    const url = model.urls[i];
    const source = url.includes('hf-mirror') ? 'HuggingFace镜像' : 
                  url.includes('huggingface') ? 'HuggingFace' : 
                  url.includes('github') ? 'GitHub' : '直连';
    
    try {
      console.log(`  尝试 ${source}...`);
      const bytes = await downloadFile(url, destPath);
      
      // Verify file
      const stat = fs.statSync(destPath);
      if (stat.size < model.expectedMinSize) {
        console.log(`  ✗ 文件不完整: ${(stat.size / 1024 / 1024).toFixed(1)} MB (期望 >${(model.expectedMinSize / 1024 / 1024).toFixed(0)} MB)`);
        fs.unlinkSync(destPath);
        continue;
      }
      
      // Verify ONNX header (protobuf magic: 0x08 at start)
      const header = Buffer.alloc(4);
      const fd = fs.openSync(destPath, 'r');
      fs.readSync(fd, header, 0, 4, 0);
      fs.closeSync(fd);
      
      if (header[0] !== 0x08) {
        console.log(`  ✗ 文件不是有效的ONNX格式`);
        fs.unlinkSync(destPath);
        continue;
      }
      
      console.log(`  ✓ ${model.name} 下载成功: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
      return true;
    } catch (err) {
      console.log(`  ✗ ${source} 失败: ${err.message}`);
    }
  }
  
  console.log(`  ✗ ${model.name}: 所有下载源均失败`);
  return false;
}

async function main() {
  console.log('=== AI 模型下载工具 ===\n');
  console.log(`模型目录: ${MODELS_DIR}`);
  
  // Ensure directory exists
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }
  
  let success = 0;
  let failed = 0;
  
  for (const model of MODELS) {
    const result = await downloadModel(model);
    if (result) success++;
    else failed++;
  }
  
  console.log(`\n=== 完成 ===`);
  console.log(`成功: ${success}, 失败: ${failed}`);
  
  // List all models
  console.log('\n模型目录内容:');
  const files = fs.readdirSync(MODELS_DIR);
  for (const file of files) {
    const stat = fs.statSync(path.join(MODELS_DIR, file));
    console.log(`  ${file}: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
  }
}

main().catch(console.error);
