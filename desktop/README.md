# NikkiGallery Web管理面板

轻量级 Web 管理面板，用于管理 NikkiGallery 的前后端服务。

## 功能特性

- 🚀 **一键启动/停止** - 快速启动或停止前后端服务
- 📊 **实时日志** - WebSocket 实时推送服务日志
- 🔄 **服务重启** - 快速重启单个或全部服务
- 📱 **响应式设计** - 支持桌面和移动设备
- 🎮 **游戏风格** - 与 NikkiGallery 主题一致的界面设计

## 快速开始

### 安装依赖

```bash
cd desktop
npm install
```

### 启动管理面板

```bash
npm start
```

或 Windows 双击运行 `start.bat`

### 访问面板

打开浏览器访问: http://localhost:19527

## 功能说明

### 服务管理

- **全部启动** - 同时启动后端和前端服务
- **全部停止** - 同时停止所有服务
- **单独控制** - 分别启动/停止/重启后端或前端服务

### 日志查看

- **实时日志** - 通过 WebSocket 实时接收服务输出
- **日志切换** - 在后端和前端日志之间切换
- **日志清空** - 清空当前显示的日志
- **自动滚动** - 新日志自动滚动到底部

### 快捷链接

- 前端界面 (http://localhost:13000)
- API 接口 (http://localhost:14000/api/albums)
- 相册页面 (http://localhost:13000/gallery)
- AI处理页面 (http://localhost:13000/ai-process)

## 技术栈

- **后端**: Node.js + Express
- **通信**: WebSocket 实时推送
- **前端**: 原生 HTML/CSS/JavaScript
- **进程管理**: tree-kill (优雅停止进程)

## 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| 管理面板 | 19527 | Web管理界面 |
| 后端API | 14000 | Express API服务 |
| 前端UI | 13000 | React开发服务器 |

## 开发

### 文件结构

```
desktop/
├── server.js        # 管理服务器主文件
├── public/
│   └── index.html   # 管理面板界面
├── start.bat        # Windows启动脚本
├── package.json     # 依赖配置
└── README.md        # 本文件
```

### 自定义端口

如需修改管理面板端口，编辑 `server.js` 中的 `PORT` 常量：

```javascript
const PORT = 19527; // 修改为其他端口
```

## 常见问题

### Q: 启动后无法访问管理面板？

A: 检查端口 19527 是否被占用，或查看控制台是否有错误信息。

### Q: 服务启动失败？

A: 确保已安装所有依赖：
- 根目录: `npm install` (如果有的话)
- server目录: `cd ../server && npm install`
- client目录: `cd ../client && npm install`

### Q: 日志不显示？

A: 检查 WebSocket 连接状态，右上角应显示"● 已连接"。

## 许可证

MIT License
