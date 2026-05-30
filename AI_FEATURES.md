# NikkiGallery AI 功能说明

## 🚀 新增功能概览

### 1. GPU 检测与加速

**功能**: 自动检测系统GPU信息，选择最佳AI推理后端

**支持的GPU类型**:
- **独立显卡** (NVIDIA/AMD) → 使用 WebGPU 加速
- **集成显卡** (Intel) → 使用 WebGL 加速
- **CPU模式** → 使用 WASM 后端

**检测信息**:
- GPU类型（独立/集成/CPU）
- 后端类型（WebGPU/WebGL/WASM）
- 渲染器名称
- 显存大小
- 支持的特性

### 2. AI 模型管理

**推荐模型列表**:

| 模型 | 类型 | 大小 | 用途 | GPU推理 | CPU推理 |
|------|------|------|------|---------|---------|
| MobileNet V3 Small | 分类 | 6.8 MB | 快速场景识别 | ~15ms | ~45ms |
| EfficientNet-Lite0 | 分类 | 12.5 MB | 高精度分类 | ~20ms | ~60ms |
| YOLOv8 Nano | 检测 | 6.2 MB | 实时目标检测 | ~8ms | ~35ms |
| YOLOv8 Small | 检测 | 22.5 MB | 详细分析 | ~15ms | ~80ms |
| ResNet-18 | 特征 | 44.7 MB | 以图搜图 | ~25ms | ~100ms |

**模型下载链接**:
- MobileNet V3: https://github.com/onnx/models/raw/main/validated/vision/classification/mobilenet/model/mobilenetv3-small-12.onnx
- EfficientNet-Lite: https://github.com/onnx/models/raw/main/validated/vision/classification/efficientnet-lite/model/efficientnet-lite0.onnx
- YOLOv8 Nano: https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.onnx
- YOLOv8 Small: https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8s.onnx
- ResNet-18: https://github.com/onnx/models/raw/main/validated/vision/classification/resnet/model/resnet18-v2-7.onnx

### 3. AI 设置界面

**功能**:
- 显示GPU加速信息
- 浏览和下载AI模型
- 查看模型详细信息（大小、性能、标签）
- 管理已下载的模型

**访问方式**:
1. 打开 AI 处理页面 (`/ai-process`)
2. 点击右上角 "AI设置" 按钮

### 4. 游戏路径自动检测

**检测方式**:
1. **自动检测** - 搜索常见安装路径、Windows注册表、Program Files
2. **手动输入** - 指定游戏安装目录

**支持的截图文件夹** (20+种):

**官方截图**:
- ScreenShot, ScreenShots, Screenshot, Screenshots
- GameScreenShot, GameScreenShots, GameScreenshot, GameScreenshots

**相册相关**:
- Album, Albums, Photo, Photos, Gallery, Snapshots

**自定义截图**:
- CustomScreenShot, CustomScreenshots, UserScreenshots, MyScreenshots

**备份**:
- ScreenshotBackup, ScreenShotBackup

**其他**:
- Capture, Captures, Records, Shots

**访问方式**:
1. 打开设置页面 (`/settings`)
2. 在 "游戏路径" 区域点击 "自动检测游戏路径"

## 📁 新增文件

### 服务端
```
server/src/
├── services/
│   ├── AIService.ts          # AI服务（GPU检测、模型管理）
│   └── GamePathService.ts    # 游戏路径检测服务
├── routes/
│   └── ai.ts                 # AI相关API路由
└── models/                   # 模型存储目录
```

### 客户端
```
client/src/
├── pages/
│   ├── AIProcess/
│   │   ├── index.tsx         # AI处理页面（已更新）
│   │   └── AISettingsModal.tsx  # AI设置模态框
│   └── Settings/
│       ├── index.tsx         # 设置页面（已更新）
│       └── GamePathDetector.tsx  # 游戏路径检测组件
└── api/
    ├── ai.ts                 # AI API（已更新）
    └── config.ts             # 配置API（已更新）
```

## 🔧 API 端点

### AI 相关
- `GET /api/ai/gpu-info` - 获取GPU信息
- `GET /api/ai/status` - 获取AI状态
- `GET /api/ai/models` - 获取推荐模型列表
- `POST /api/ai/classify` - 图像分类
- `POST /api/ai/detect` - 目标检测
- `POST /api/ai/extract-features` - 提取特征向量
- `POST /api/ai/search-similar` - 相似图片搜索
- `POST /api/ai/batch-process` - 批量处理

### 配置相关
- `GET /api/config/detect-game-path` - 自动检测游戏路径
- `GET /api/config/screenshot-folders` - 获取截图文件夹列表

## 🎯 使用示例

### 1. 检测GPU信息
```bash
curl http://localhost:14000/api/ai/gpu-info
```

响应示例:
```json
{
  "success": true,
  "data": {
    "type": "discrete",
    "backend": "webgpu",
    "renderer": "NVIDIA GeForce RTX 3060",
    "vendor": "NVIDIA",
    "memory": 12288,
    "features": ["webgpu", "webgl", "wasm"]
  }
}
```

### 2. 获取模型列表
```bash
curl http://localhost:14000/api/ai/models
```

### 3. 自动检测游戏路径
```bash
curl http://localhost:14000/api/config/detect-game-path
```

响应示例:
```json
{
  "success": true,
  "data": {
    "gamePath": "D:\\Games\\InfinityNikki",
    "screenshotFolders": [
      {
        "name": "ScreenShot",
        "path": "D:\\Games\\InfinityNikki\\ScreenShot",
        "type": "official",
        "description": "游戏内截图",
        "fileCount": 156,
        "lastModified": "2026-05-30T10:30:00.000Z"
      }
    ]
  }
}
```

## 🚧 后续开发计划

### 短期（1-2周）
- [ ] 实现真正的ONNX模型推理
- [ ] 完善模型下载进度跟踪
- [ ] 添加模型性能基准测试

### 中期（1个月）
- [ ] 支持自定义模型上传
- [ ] 实现批量图片分类和标注
- [ ] 优化GPU内存管理

### 长期（3个月）
- [ ] 支持更多AI任务（语义分割、姿态估计）
- [ ] 实现模型微调功能
- [ ] 添加云端AI推理选项

## 💡 技术栈

- **AI推理**: ONNX Runtime (Web)
- **GPU加速**: WebGPU / WebGL
- **模型格式**: ONNX
- **后端**: Node.js + Express
- **前端**: React + TypeScript

## 📝 注意事项

1. **模型下载**: 模型文件较大（6-45MB），首次使用需要下载
2. **GPU兼容性**: WebGPU需要较新的浏览器和驱动支持
3. **性能**: GPU推理速度取决于显卡性能，CPU推理较慢但兼容性更好
4. **存储**: 模型文件存储在 `server/models/` 目录

## 🔗 相关链接

- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)
- [ONNX Model Zoo](https://github.com/onnx/models)
- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics)
- [WebGPU Documentation](https://www.w3.org/TR/webgpu/)
