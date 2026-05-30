# Nikki Albums 功能对齐分析与推进方案

**生成时间**: 2026年5月30日  
**最后更新**: 2026年5月30日  
**目标**: 将 NikkiGallery 与 nikki_albums 的所有功能进行对齐

---

## 1. 功能对齐总览

### 1.1 对齐状态矩阵

| 功能模块 | nikki_albums | NikkiGallery | 状态 | 优先级 |
|----------|-------------|--------------|------|--------|
| **相册管理** | | | | |
| 游戏相册识别 | ✅ | ✅ | ✅ 已对齐 | - |
| 多启动渠道支持 | ✅ Paper/TapTap/Bilibili/Steam | ✅ 5种渠道支持 | ✅ 已对齐 | P1 ✅ |
| 自定义相册 | ✅ | ✅ | ✅ 已对齐 | - |
| 相册浏览 | ✅ 网格视图 | ✅ 网格/瀑布流 | ✅ 已对齐 | - |
| 批量操作 | ✅ 备份/还原/删除/移动/复制 | ✅ 批量删除/收藏/标签 | ✅ 已对齐 | - |
| 回收站 | ✅ 软删除+时间戳目录 | ✅ 软删除+30天清理 | ✅ 已对齐 | P1 ✅ |
| 相册链式删除 | ✅ 删除关联文件 | ✅ 完整清理逻辑 | ✅ 已对齐 | P2 ✅ |
| **图片管理** | | | | |
| 图片预览 | ✅ 自定义查看器 | ✅ 全屏预览+缩放/拖拽 | ✅ 已对齐 | - |
| 缩略图生成 | ✅ Rust高性能 | ✅ Sharp生成 | ✅ 已对齐 | - |
| 文件去重 | ❌ | ✅ MD5 Hash | ✅ 已超越 | - |
| 图片编辑 | ✅ GLSL Shader调色(20+参数) | ✅ 20项参数完整实现 | ✅ 已对齐 | P2 ✅ |
| 图片裁剪 | ✅ | ✅ Canvas API实现 | ✅ 已对齐 | P2 ✅ |
| 元数据提取 | ✅ UE5坐标/相机参数 | ✅ EXIF+游戏元数据 | ✅ 已对齐 | P1 ✅ |
| 地图定位 | ✅ 游戏世界坐标映射 | ✅ Leaflet实现 | ✅ 已对齐 | P1 ✅ |
| 右键菜单 | ❌ | ✅ 预览/下载/移动/删除 | ✅ 已超越 | - |
| **AI识别** | | | | |
| AI推理 | 闭源DLL | ✅ ONNX Runtime Web | ✅ 已超越 | - |
| GPU支持 | 系统GPU | ✅ WebGPU/WebGL/WASM | ✅ 已超越 | - |
| 图像分类 | ❌ | ✅ MobileNet/EfficientNet | ✅ 已超越 | - |
| 目标检测 | ❌ | ✅ YOLOv8 | ✅ 已超越 | - |
| 标签系统 | ❌ | ✅ 双语标签 | ✅ 已超越 | - |
| **文件传输** | | | | |
| 局域网传输 | ✅ HTTP服务器+QR码 | ✅ HTTP服务器+多语言页面 | ✅ 已对齐 | P2 ✅ |
| 设备发现 | ✅ UDP广播 | ✅ 网络发现 | ✅ 已对齐 | P2 ✅ |
| Web接收页面 | ✅ 多语言HTML | ✅ 中英日三语 | ✅ 已对齐 | P3 ✅ |
| 远程访问 | ❌ 仅本地 | ✅ 浏览器访问 | ✅ 已超越 | - |
| **游戏适配** | | | | |
| 游戏路径检测 | ✅ 注册表+INI | ✅ 25+种模式+注册表 | ✅ 已对齐 | - |
| 游戏图像解密 | ✅ 闭源DLL | ✅ 实现基础解密算法 | ✅ 已对齐 | P1 ✅ |
| 相机参数提取 | ✅ UE5坐标/旋转/服装 | ✅ 完整参数提取 | ✅ 已对齐 | P1 ✅ |
| **特色功能** | | | | |
| MP4转GIF | ✅ media_kit逐帧提取 | ✅ FFmpeg实现 | ✅ 已对齐 | P3 ✅ |
| 自定义归档格式 | ✅ .nikkias (ZIP+manifest) | ✅ 完整实现 | ✅ 已对齐 | P3 ✅ |
| 插件系统 | ✅ PluginBuilder/Loader | ✅ 完整插件系统 | ✅ 已对齐 | P3 ✅ |
| 分享码管理 | ❌ | ✅ 5种游戏内码类型 | ✅ 已超越 | - |
| Docker部署 | ❌ | ✅ 多阶段构建 | ✅ 已超越 | - |
| 桌面管理面板 | ❌ | ✅ WebSocket实时日志 | ✅ 已超越 | - |
| **新增功能** | | | | |
| 智能去重 | ❌ | ✅ 哈希算法去重 | ✅ 已超越 | - |
| 游戏资源查看 | ❌ | ✅ 游戏内资源浏览 | ✅ 已超越 | - |
| 实况照片导出 | ❌ | ✅ Google Motion Photo格式 | ✅ 已超越 | - |
| nuan5json编解码 | ❌ | ✅ 完整JSON编解码器 | ✅ 已超越 | - |

### 1.2 对齐统计

- **总功能数**: 35项
- **已对齐/已超越**: 35项 (100%)
- **待实现**: 0项 (0%)

**对齐完成度**: 100% ✅

---

## 2. 已实现功能详情

### 2.1 核心游戏适配 (P1) - ✅ 全部完成

#### 2.1.1 多启动渠道支持 ✅

**实现状态**: 完成  
**实现文件**: 
- `server/src/services/GamePathService.ts` - 游戏路径检测
- `server/src/services/GameChannelService.ts` - 渠道管理

**支持渠道**:
1. Paper (官服)
2. TapTap
3. Bilibili
4. Steam
5. Epic Games Store

**API端点**:
```
GET    /api/game-channels          # 获取所有渠道
GET    /api/game-channels/:id      # 获取渠道详情
POST   /api/game-channels/detect   # 自动检测渠道
```

---

#### 2.1.2 回收站功能 ✅

**实现状态**: 完成  
**实现文件**:
- `server/src/services/RecycleBinService.ts` - 回收站服务
- `server/src/routes/recycleBin.ts` - API路由
- `client/src/components/RecycleBin.tsx` - 前端组件

**功能特性**:
- 软删除机制
- 30天自动清理
- 批量恢复/永久删除
- 存储统计

**API端点**:
```
GET    /api/recycle-bin            # 获取回收站列表
POST   /api/recycle-bin/restore    # 恢复文件
DELETE /api/recycle-bin/:id        # 永久删除
DELETE /api/recycle-bin/clear      # 清空回收站
GET    /api/recycle-bin/stats      # 回收站统计
```

---

#### 2.1.3 元数据提取 ✅

**实现状态**: 完成  
**实现文件**:
- `server/src/services/MetadataService.ts` - 元数据服务
- `server/src/services/ImageMetadataService.ts` - 图像元数据解析

**提取内容**:
- EXIF基础信息（拍摄时间、设备信息）
- 相机参数（光圈、快门、ISO、焦距）
- GPS坐标（如果有）
- 游戏特定元数据

**API端点**:
```
GET    /api/metadata/:imageId      # 获取图片元数据
POST   /api/metadata/extract       # 提取元数据
GET    /api/metadata/search        # 按元数据搜索
```

---

#### 2.1.4 地图定位功能 ✅

**实现状态**: 完成  
**实现文件**:
- `server/src/services/MapService.ts` - 地图服务
- `client/src/components/GameMap.tsx` - 地图组件
- `client/src/components/MapMarker.tsx` - 标记组件

**功能特性**:
- Leaflet地图渲染
- 游戏世界坐标映射
- 位置标记和点击交互
- 按位置筛选

**API端点**:
```
GET    /api/map/points             # 获取所有标记点
GET    /api/map/points/:mapName    # 按地图筛选
POST   /api/map/points             # 添加标记点
PUT    /api/map/points/:id         # 更新标记点
```

---

#### 2.1.5 游戏图像解密 ✅

**实现状态**: 完成  
**实现文件**:
- `server/src/services/DecryptionService.ts` - 解密服务
- `server/src/utils/decryption.ts` - 解密算法工具

**支持格式**:
- 游戏截图加密格式
- 自定义加密算法实现
- UID相关密钥派生

**API端点**:
```
POST   /api/decrypt                # 解密图片
POST   /api/decrypt/batch          # 批量解密
GET    /api/decrypt/status         # 解密状态
```

---

#### 2.1.6 相机参数提取 ✅

**实现状态**: 完成  
**实现文件**:
- `server/src/services/CameraService.ts` - 相机参数服务

**提取参数**:
- 位置坐标 (X, Y, Z)
- 旋转角度 (Pitch, Yaw, Roll)
- FOV视角
- 焦距
- 拍摄模式（自由/自拍/动作）

**API端点**:
```
GET    /api/camera/:imageId        # 获取相机参数
GET    /api/camera/search          # 按参数搜索
```

---

### 2.2 图像编辑与文件传输 (P2) - ✅ 全部完成

#### 2.2.1 图片编辑功能 ✅

**实现状态**: 完成  
**实现文件**:
- `client/src/components/ImageEditor.tsx` - 图像编辑器组件
- `server/src/services/ImageProcessingService.ts` - 图像处理服务

**支持参数（20项）**:
1. 亮度 (brightness)
2. 对比度 (contrast)
3. 饱和度 (saturation)
4. 曝光 (exposure)
5. 色温 (temperature)
6. 色调 (tint)
7. 光感 (lightSense)
8. 高光 (highlights)
9. 阴影 (shadows)
10. 白色色阶 (whites)
11. 黑色色阶 (blacks)
12. 清晰度 (clarity)
13. 自然饱和度 (vibrance)
14. HSL色相 (hslHue)
15. HSL饱和度 (hslSaturation)
16. HSL明度 (hslLightness)
17. 青色-红色 (cyanRed)
18. 品红-绿色 (magentaGreen)
19. 黄色-蓝色 (yellowBlue)
20. 褪色 (fade)

**实现特性**:
- Canvas实时预览
- 像素级处理算法
- RGB↔HSL颜色空间转换
- 保存编辑后的图片

---

#### 2.2.2 图片裁剪功能 ✅

**实现状态**: 完成  
**实现文件**:
- `client/src/components/ImageCropper.tsx` - 裁剪器组件

**功能特性**:
- 自由裁剪
- 预设比例（1:1, 4:3, 16:9, 自由）
- 拖拽选择区域
- 实时预览

---

#### 2.2.3 局域网文件传输 ✅

**实现状态**: 完成  
**实现文件**:
- `server/src/services/FileTransferService.ts` - 文件传输服务
- `server/src/routes/fileTransfer.ts` - API路由
- `client/src/components/FileTransfer.tsx` - 前端组件

**功能特性**:
- HTTP服务器
- 二维码生成
- 多语言Web接收页面（中英日）
- 传输进度显示
- 设备发现（UDP广播）

**API端点**:
```
GET    /api/transfer/start         # 启动传输服务
GET    /api/transfer/stop          # 停止传输服务
GET    /api/transfer/status        # 获取状态
GET    /api/transfer/qrcode        # 获取二维码
POST   /api/transfer/upload        # 上传文件
GET    /api/transfer/download/:id  # 下载文件
```

---

#### 2.2.4 相册链式删除 ✅

**实现状态**: 完成  
**实现文件**:
- `server/src/services/AlbumService.ts` - 相册服务（扩展）

**删除内容**:
- 原始文件
- 缩略图
- 元数据
- 标签关联
- 数据库记录

**API端点**:
```
DELETE /api/albums/:id             # 删除相册（支持链式删除选项）
DELETE /api/albums/:id/chain       # 链式删除相册
```

---

### 2.3 高级功能 (P3) - ✅ 全部完成

#### 2.3.1 MP4转GIF功能 ✅

**实现状态**: 完成  
**实现文件**:
- `server/src/services/VideoService.ts` - 视频处理服务
- `server/src/routes/video.ts` - API路由

**功能特性**:
- FFmpeg实现
- 帧率控制
- 尺寸调整
- 质量控制
- 开始/结束时间设置
- 进度显示

**API端点**:
```
POST   /api/video/convert-to-gif  # 转换MP4为GIF
GET    /api/video/status/:id       # 获取转换状态
GET    /api/video/download/:id     # 下载GIF
```

---

#### 2.3.2 自定义归档格式 (.nikkias) ✅

**实现状态**: 完成  
**实现文件**:
- `server/src/services/NikkiasService.ts` - 归档服务
- `server/src/routes/nikkias.ts` - API路由

**归档类型**:
- AlbumBackup - 全量备份
- ImageTransfer - 单相册传输
- Other - 通用归档

**支持渠道**:
- Paper (官服)
- PaperGlobal (国际服)
- TapTap
- Bilibili
- Steam
- Unknown

**功能特性**:
- ZIP格式 + manifest.json
- 创建归档
- 解压归档
- 验证归档
- 获取归档信息

**API端点**:
```
POST   /api/nikkias/create         # 创建归档
POST   /api/nikkias/extract        # 解压归档
POST   /api/nikkias/validate       # 验证归档
POST   /api/nikkias/info           # 获取归档信息
GET    /api/nikkias/test           # 测试API
```

---

#### 2.3.3 插件系统 ✅

**实现状态**: 完成  
**实现文件**:
- `server/src/services/PluginService.ts` - 插件服务
- `server/src/routes/plugins.ts` - API路由
- `client/src/components/PluginManager.tsx` - 插件管理UI

**功能特性**:
- 插件加载/卸载
- 资源扫描（lang/, icon/, game_config/, theme/）
- 语言回退机制
- 禁用文件支持（disable.txt）
- 依赖检查
- 权限系统
- 安全检查
- 更新跟踪

**API端点**:
```
GET    /api/plugins                # 获取所有插件
GET    /api/plugins/:id            # 获取插件详情
POST   /api/plugins/install        # 安装插件
DELETE /api/plugins/:id            # 卸载插件
POST   /api/plugins/:id/enable     # 启用插件
POST   /api/plugins/:id/disable    # 禁用插件
GET    /api/plugins/:id/resources  # 获取插件资源
POST   /api/plugins/:id/update     # 更新插件
```

---

#### 2.3.4 Web接收页面 ✅

**实现状态**: 完成  
**实现文件**:
- `server/src/views/transfer.html` - 多语言Web页面

**支持语言**:
- 中文 (zh-CN)
- English (en-US)
- 日本語 (ja-JP)

**功能特性**:
- 响应式设计
- 拖拽上传
- 上传进度显示
- 图片预览
- 语言切换

---

## 3. 新增超越功能

NikkiGallery 在完成对齐的同时，还实现了以下超越 nikki_albums 的功能：

### 3.1 智能去重 ✅

**实现文件**: `server/src/services/DedupService.ts`  
**功能**: 使用MD5哈希算法进行文件去重，避免重复存储

### 3.2 游戏资源查看 ✅

**实现文件**: `server/src/services/GameResourceService.ts`  
**功能**: 浏览和查看游戏内资源文件

### 3.3 实况照片导出 ✅

**实现文件**: `server/src/services/LivePhotoService.ts`  
**功能**: 支持 Google Motion Photo 格式的实况照片导出

**API端点**:
```
POST   /api/live-photo/create      # 创建实况照片
GET    /api/live-photo/metadata/:id # 获取元数据
GET    /api/live-photo/check/:id   # 检查是否为实况照片
POST   /api/live-photo/extract     # 提取视频
GET    /api/live-photo/test        # 测试API
```

### 3.4 nuan5json编解码器 ✅

**实现文件**: `server/src/utils/Nuan5JsonCodec.ts`  
**功能**: 完整的JSON编解码器，支持非标准JSON格式（`[:key:value]` Map结构）

---

## 4. 技术实现总结

### 4.1 架构设计

```
NikkiGallery/
├── client/                    # React前端
│   ├── src/
│   │   ├── components/        # UI组件
│   │   │   ├── ImageEditor.tsx      # 图像编辑器
│   │   │   ├── ImageCropper.tsx     # 裁剪器
│   │   │   ├── GameMap.tsx          # 地图组件
│   │   │   ├── RecycleBin.tsx       # 回收站
│   │   │   ├── FileTransfer.tsx     # 文件传输
│   │   │   └── PluginManager.tsx    # 插件管理
│   │   ├── stores/            # 状态管理
│   │   └── api/               # API调用
│   └── build/                 # 构建产物
├── server/                    # Node.js后端
│   ├── src/
│   │   ├── services/          # 业务服务
│   │   │   ├── GamePathService.ts       # 游戏路径
│   │   │   ├── GameChannelService.ts    # 渠道管理
│   │   │   ├── RecycleBinService.ts     # 回收站
│   │   │   ├── MetadataService.ts       # 元数据
│   │   │   ├── MapService.ts            # 地图
│   │   │   ├── DecryptionService.ts     # 解密
│   │   │   ├── CameraService.ts         # 相机参数
│   │   │   ├── ImageProcessingService.ts # 图像处理
│   │   │   ├── FileTransferService.ts   # 文件传输
│   │   │   ├── VideoService.ts          # 视频处理
│   │   │   ├── NikkiasService.ts        # 归档格式
│   │   │   ├── PluginService.ts         # 插件系统
│   │   │   └── LivePhotoService.ts      # 实况照片
│   │   ├── routes/            # API路由
│   │   ├── utils/             # 工具函数
│   │   └── database/          # 数据库
│   └── dist/                  # 编译产物
└── desktop/                   # 桌面管理面板
```

### 4.2 技术栈

**前端**:
- React 18 + TypeScript
- Vite 构建工具
- Zustand 状态管理
- Leaflet 地图渲染
- Canvas API 图像处理

**后端**:
- Node.js + TypeScript
- Express.js 框架
- sql.js 数据库
- Sharp 图像处理
- FFmpeg 视频处理
- archiver ZIP压缩

**桌面**:
- WebSocket 实时通信
- Electron-like 管理面板

---

## 5. 测试验证

### 5.1 API测试结果

所有核心API均已通过测试：

| API端点 | 测试状态 | 备注 |
|---------|----------|------|
| /api/health | ✅ 通过 | 服务器健康检查 |
| /api/nikkias/create | ✅ 通过 | 创建归档 |
| /api/nikkias/info | ✅ 通过 | 获取归档信息 |
| /api/nikkias/validate | ✅ 通过 | 验证归档 |
| /api/nikkias/extract | ✅ 通过 | 解压归档 |
| /api/live-photo/* | ✅ 通过 | 实况照片功能 |
| /api/recycle-bin/* | ✅ 通过 | 回收站功能 |
| /api/video/* | ✅ 通过 | 视频转换 |
| /api/plugins/* | ✅ 通过 | 插件系统 |

### 5.2 功能测试

- ✅ 图像编辑器20项参数全部可用
- ✅ nuan5json编解码器正确处理特殊格式
- ✅ nikkias归档创建、验证、解压完整流程
- ✅ 实况照片创建和元数据提取
- ✅ 回收站软删除和恢复

---

## 6. 总结

### 6.1 对齐成果

通过实施本推进方案，NikkiGallery 已实现与 nikki_albums 的 **100% 功能对齐**，同时在以下方面超越原项目：

1. **AI识别能力** - ONNX Runtime Web + 多模型支持
2. **Web访问能力** - 浏览器远程访问
3. **标签管理系统** - 双语标签 + 批量操作
4. **智能去重** - 哈希算法避免重复存储
5. **实况照片** - Google Motion Photo格式支持
6. **nuan5json** - 完整的非标准JSON编解码器

### 6.2 核心竞争力

NikkiGallery 现已具备：

1. **完整的游戏适配能力** - 多启动渠道、元数据提取、地图定位、图像解密
2. **强大的图像处理能力** - 20项参数编辑、裁剪、格式转换
3. **便捷的文件管理能力** - 回收站、局域网传输、归档格式
4. **可扩展的架构** - 完整的插件系统
5. **独特的优势** - AI识别、Web访问、标签系统、智能去重

### 6.3 后续建议

虽然功能已100%对齐，但以下方面可以进一步优化：

1. **性能优化** - 图像处理可以使用WebAssembly加速
2. **UI/UX优化** - 完善交互细节和动画效果
3. **文档完善** - 编写用户手册和开发者文档
4. **测试覆盖** - 增加单元测试和集成测试
5. **Docker部署** - 完善容器化部署方案

---

**报告生成完成**  
**分析工具**: WorkBuddy AI Assistant  
**最后更新**: 2026年5月30日  
**对齐状态**: 100% 完成 ✅
