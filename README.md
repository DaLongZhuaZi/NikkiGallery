# NikkiGallery - 无限暖暖智能相册管理系统

一个专为《无限暖暖》游戏玩家设计的智能相册管理系统，集成本地AI图像识别功能。

## ✨ 功能特性

- 🖼️ **相册管理** - 自动扫描游戏截图，支持自定义相册
- 🤖 **AI识别** - 本地运行AI模型，自动识别场景、服装、动作
- 🏷️ **智能标签** - 中英双语标签系统，支持AI和手动标签
- 🔍 **高级搜索** - 按标签、时间、收藏等多维度筛选
- 📤 **分享码管理** - 管理染色码、家园码、拍照码等
- 🌐 **Web界面** - 纯浏览器操作，支持任意设备访问
- 🎮 **游戏适配** - 专为无限暖暖游戏优化
- 🚀 **GPU加速** - 支持WebGPU/WebGL加速，自动检测显卡
- 📁 **智能路径检测** - 自动搜索游戏安装路径和截图文件夹
- 🧠 **模型管理** - 支持下载和管理多种AI模型（MobileNet、YOLOv8、ResNet等）

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd NikkiGallery

# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install

# 安装桌面应用依赖（可选）
cd ../desktop
npm install
```

### 启动开发环境

#### 方式1：使用Web管理面板（推荐）

```bash
cd desktop
npm install
npm start
```

然后访问 http://localhost:19527 打开管理面板，可以一键启动/停止前后端服务、查看实时日志。

或 Windows 双击运行 `desktop/start.bat`

#### 方式2：使用命令行脚本

**Windows:**
```bash
# 双击运行
start-dev.bat
```

**手动启动:**
```bash
# 终端1 - 启动后端
cd server
npm run dev

# 终端2 - 启动前端
cd client
npm run dev
```

### 访问应用

- 前端界面: http://localhost:13000
- 后端API: http://localhost:14000

## 📁 项目结构

```
NikkiGallery/
├── client/              # 前端 React 应用
│   ├── src/
│   │   ├── ai/          # AI模型和推理
│   │   ├── components/  # React组件
│   │   ├── pages/       # 页面组件
│   │   ├── stores/      # Zustand状态管理
│   │   └── types/       # TypeScript类型
│   └── package.json
├── server/              # 后端 Express 应用
│   ├── src/
│   │   ├── database/    # SQLite数据库
│   │   ├── models/      # 数据模型
│   │   ├── routes/      # API路由
│   │   ├── services/    # 业务逻辑
│   │   └── middleware/  # 中间件
│   ├── models/          # AI模型存储目录
│   └── package.json
├── desktop/             # Web管理面板
│   ├── server.js        # 管理服务器
│   ├── public/          # 前端界面
│   ├── start.bat        # Windows启动脚本
│   └── package.json
├── AI_FEATURES.md       # AI功能详细说明
├── start-dev.bat        # Windows启动脚本
└── README.md
```

## 🛠️ 技术栈

### 前端
- React 18 + TypeScript
- Vite 构建工具
- Tailwind CSS 样式
- Zustand 状态管理
- ONNX Runtime Web AI推理

### 后端
- Node.js + Express
- TypeScript
- sql.js (SQLite)
- Sharp 图片处理

### 管理面板
- Node.js + Express
- WebSocket 实时通信
- 原生 HTML/CSS/JS

## 📖 API文档

### 相册 API

- `GET /api/albums` - 获取所有相册
- `POST /api/albums` - 创建相册
- `PUT /api/albums/:id` - 更新相册
- `DELETE /api/albums/:id` - 删除相册
- `POST /api/albums/scan` - 扫描游戏相册

### 图片 API

- `GET /api/images` - 获取图片列表
- `GET /api/images/:id` - 获取图片详情
- `PUT /api/images/:id` - 更新图片
- `DELETE /api/images/:id` - 删除图片
- `POST /api/images/batch` - 批量操作

### 标签 API

- `GET /api/tags` - 获取所有标签
- `POST /api/tags` - 创建标签
- `PUT /api/tags/:id` - 更新标签
- `DELETE /api/tags/:id` - 删除标签

### 分享码 API

- `GET /api/share-codes` - 获取分享码列表
- `POST /api/share-codes` - 创建分享码
- `PUT /api/share-codes/:id` - 更新分享码
- `DELETE /api/share-codes/:id` - 删除分享码

### AI API

- `GET /api/ai/gpu-info` - 获取GPU信息
- `GET /api/ai/status` - 获取AI状态
- `GET /api/ai/models` - 获取推荐模型列表
- `POST /api/ai/classify` - 图像分类
- `POST /api/ai/detect` - 目标检测
- `POST /api/ai/extract-features` - 提取特征向量
- `POST /api/ai/search-similar` - 相似图片搜索
- `POST /api/ai/batch-process` - 批量处理

### 配置 API

- `GET /api/config` - 获取系统配置
- `PUT /api/config` - 更新系统配置
- `GET /api/config/detect-game-path` - 自动检测游戏路径
- `GET /api/config/screenshot-folders` - 获取截图文件夹列表

## 🎯 使用指南

1. **首次启动** - 启动后访问 http://localhost:13000
2. **配置游戏路径** - 在设置页面点击"自动检测游戏路径"，或手动输入游戏安装目录
3. **下载AI模型** - 在AI处理页面点击"AI设置"，下载推荐的AI模型
4. **AI处理** - 选择图片后点击"开始处理"，自动识别并添加标签
5. **搜索筛选** - 使用标签、时间、收藏等条件筛选图片
6. **管理分享码** - 添加、编辑、导出游戏分享码

## 📝 开发说明

### 构建生产版本

```bash
# 构建前端
cd client
npm run build

# 构建后端
cd ../server
npm run build
```

### Docker 部署

项目支持 Docker 容器化部署，包含前端、后端和数据库服务。

#### 使用 Docker Compose（推荐）

```bash
# 进入 docker 目录
cd docker

# 配置环境变量（可选）
export GAME_SCREENSHOTS_PATH=/path/to/game/screenshots
export CUSTOM_ALBUMS_PATH=/path/to/custom/albums

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 手动构建镜像

```bash
# 构建后端镜像
docker build -f docker/Dockerfile.server -t nikki-gallery-server .

# 构建前端镜像
docker build -f docker/Dockerfile.client -t nikki-gallery-client .

# 运行后端
docker run -d \
  --name nikki-server \
  -p 14000:14000 \
  -v nikki-data:/app/data \
  -v /path/to/screenshots:/app/screenshots:ro \
  nikki-gallery-server

# 运行前端
docker run -d \
  --name nikki-client \
  -p 13000:80 \
  --link nikki-server:server \
  nikki-gallery-client
```

#### 访问应用

- 前端界面: http://localhost:13000
- 后端API: http://localhost:14000

#### 数据持久化

Docker 部署使用以下卷进行数据持久化：

- `nikki-data` - 存储数据库、缩略图、日志等
- 游戏截图目录（只读挂载）
- 自定义相册目录

### 数据库

项目使用 sql.js (纯JavaScript SQLite)，数据存储在 `server/data/nikki-gallery.db`。

### AI模型

AI模型文件存放在 `server/models/` 目录，支持：
- **MobileNet V3 Small** - 轻量级图像分类（6.8MB）
- **EfficientNet-Lite0** - 高精度分类（12.5MB）
- **YOLOv8 Nano** - 极速目标检测（6.2MB）
- **YOLOv8 Small** - 标准目标检测（22.5MB）
- **ResNet-18** - 特征提取用于以图搜图（44.7MB）

详细说明请参考 [AI_FEATURES.md](./AI_FEATURES.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [无限暖暖](https://nikki.theplanetseries.com/) - 游戏官方
- [ONNX Runtime](https://onnxruntime.ai/) - AI推理引擎
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架
- [Zustand](https://github.com/pmndrs/zustand) - 状态管理
