# NikkiGallery vs nikki_albums 深度实现对比分析

> 分析日期: 2026-05-30
> 分析范围: 功能模块的**具体算法实现**，非表面功能清单

---

## 一、总览对比矩阵

| 功能模块 | nikki_albums (Flutter/Rust) | NikkiGallery (React/Node.js) | 对等度 |
|---------|---------------------------|------------------------------|--------|
| 图像解密 | Rust FFI (`mediaDecodeFileUnchecked`) | Node.js crypto (AES-256-ECB) | ✅ 对等 |
| nuan5json 解析 | 完整自定义编解码器 (~200行) | 简化版 JSON.parse + fallback | ❌ **严重缺失** |
| 相机参数解密 | Rust FFI (`mediaDecrypt`) + 独立密钥 | MetadataService 提取 + 解析 | ✅ 对等 |
| 地图系统 | 6图/15区域/多边形检测/坐标变换 | 6图/15区域/射线法/坐标变换 | ✅ 完全对等 |
| 标签系统 | JSON文件存储 + ChangeNotifier | SQLite 关系表 + REST API | ✅ 对等(架构不同) |
| 相册控制器 | ClassificationStandard + 多重过滤 | AlbumService + 时间分组 | ✅ 基本对等 |
| 回收站 | 文件系统级 + 目录监听 + 安全倒计时 | 数据库软删除 | ✅ 对等(架构不同) |
| 图片编辑器 | 20项调色 + 裁剪 + 撤销/重做栈 | 10项调色 + 裁剪 + 撤销/重做 | ⚠️ 部分缺失 |
| MP4转GIF | media_kit + image库 + 精确seek | FFmpeg + 调色板生成 | ✅ 对等(实现不同) |
| 文件传输 | HTTP + UDP广播 + QR码 + nikkias | HTTP + 下载/上传任务 + token | ✅ 对等 |
| 插件系统 | 文件系统 + Rust序列化 + 语言/图标/配置 | JSON配置 + 目录结构 | ⚠️ 功能较简 |
| 资源管理 | 平台感知路径 + 用户名变量 | 3种资源类型 + 路径解析 | ✅ 对等 |
| 归档系统 | .nikkias (ZIP) + manifest类型分发 | ZIP + archiver/unzipper | ⚠️ 缺少nikkias格式 |
| 实况照片导出 | Apple Live Photo + Google Motion Photo | **未实现** | ❌ **缺失** |
| 批量操作 | 内嵌AlbumController (6种) | 独立BatchOperationService (9种) | ✅ NikkiGallery更丰富 |
| 去重服务 | 无独立模块 | DedupService (两级哈希) | ✅ NikkiGallery优势 |
| 元数据提取 | GameCameraParamCodec (Rust) | MetadataService (sharp + 自定义解析) | ✅ 对等 |
| 多语言 | easy_localization (20+语言) | i18next + react-i18next | ✅ 对等 |
| 游戏搜索 | Strategy模式 (Windows/Mac) | 多策略 (路径/注册表/文件系统) | ✅ 对等 |
| UID发现 | 目录扫描 + isUidType验证 | 目录扫描 + 正则匹配 | ✅ 对等 |

---

## 二、关键差异详解

### 2.1 ❌ nuan5json 解析 — 严重缺失

**nikki_albums 实现** (`codec.dart` 第170-400行):
- 完整的自定义 JSON 编解码器 `GameJsonCodec`
- 支持非字符串 Map 键（序列化为 `[:key:value]` 数组格式）
- 支持嵌套对象、数组的递归解析
- 处理特殊转义字符和 Unicode
- 编码器支持格式化输出（缩进、空格控制）
- 约200行纯算法代码

**NikkiGallery 实现** (`ImageDecryptService.ts` 第200-216行):
```typescript
private static parseNuan5Json(text: string): any {
    try {
      let cleanText = text.trim()
      if (cleanText.startsWith('[') && cleanText.endsWith(']')) {
        cleanText = cleanText.slice(1, -1).trim()
      }
      return JSON.parse(cleanText)  // 直接用标准JSON解析
    } catch (error) {
      return { rawText: text.substring(0, 1000) }  // 失败则返回原始文本
    }
}
```

**影响**: 当游戏截图包含非标准JSON结构（如非字符串键的Map）时，NikkiGallery会解析失败，返回原始文本而非结构化数据。这会导致元数据丢失。

**建议**: 需要实现完整的 nuan5json 编解码器，特别是：
1. `[:key:value]` 数组格式的 Map 解析
2. Unicode 转义处理
3. 嵌套结构的递归解析

---

### 2.2 ⚠️ 图片编辑器 — 参数覆盖不完整

**nikki_albums 实现** (`fragment.dart`):
20项色彩调整参数：
1. temperature (色温)
2. tint (色调)
3. lightSense (光感) ← **NikkiGallery缺失**
4. exposure (曝光)
5. brightness (亮度)
6. contrast (对比度)
7. highlights (高光)
8. shadows (阴影)
9. whites (白色) ← **NikkiGallery缺失**
10. blacks (黑色) ← **NikkiGallery缺失**
11. vibrance (自然饱和度)
12. saturation (饱和度)
13. hslHue (HSL色相) ← **NikkiGallery缺失**
14. hslSaturation (HSL饱和度) ← **NikkiGallery缺失**
15. hslLightness (HSL明度) ← **NikkiGallery缺失**
16. cyanRed (青红) ← **NikkiGallery缺失**
17. magentaGreen (品红绿) ← **NikkiGallery缺失**
18. yellowBlue (黄蓝) ← **NikkiGallery缺失**
19. clarity (清晰度)
20. fade (褪色) ← **NikkiGallery缺失**

**NikkiGallery 实现** (`ImageEditor.tsx`):
10项色彩调整参数：
1. brightness (亮度)
2. contrast (对比度)
3. saturation (饱和度)
4. exposure (曝光)
5. temperature (色温)
6. tint (色调)
7. highlights (高光)
8. shadows (阴影)
9. clarity (清晰度)
10. vibrance (自然饱和度)

**缺失的10项参数**:
- lightSense (光感)
- whites (白色)
- blacks (黑色)
- hslHue (HSL色相)
- hslSaturation (HSL饱和度)
- hslLightness (HSL明度)
- cyanRed (青红通道)
- magentaGreen (品红绿通道)
- yellowBlue (黄蓝通道)
- fade (褪色)

**裁剪功能对比**:
- nikki_albums: 7种预设比例 (free/origin/current/1:1/3:4/4:3/16:9/9:16) + 锚点拖拽 + 自由裁剪
- NikkiGallery: 8种预设比例 (自由/1:1/4:3/3:4/16:9/9:16/3:2/2:3) + 旋转
- 基本对等

---

### 2.3 ❌ 实况照片导出 — 完全缺失

**nikki_albums 实现** (`live_photo_export_service.dart`):
- 策略模式：`AppleLivePhotoStrategy` (macOS) + `GoogleMotionPhotoStrategy` (跨平台)
- Apple Live Photo: 使用原生 MethodChannel 调用 AVFoundation，注入 UUID 元数据
- Google Motion Photo: 将视频嵌入 JPEG 的 Motion Photo 格式
- 设置页面支持格式选择（none/apple/google）

**NikkiGallery**: 无任何实况照片相关代码。

---

### 2.4 ⚠️ 插件系统 — 功能简化

**nikki_albums 实现**:
- 完整的插件生命周期：构建(`plugin_builder.dart`) + 加载(`plugin_loader.dart`)
- 插件内容：语言包、图标集、游戏配置、主题
- Rust FFI 序列化/反序列化
- 平台感知的插件目录（Windows/Linux: 可执行文件同目录, macOS: Application Support）
- 插件启用/禁用状态管理

**NikkiGallery 实现** (`PluginService.ts`):
- JSON 配置文件管理 (`data/plugins.json`)
- 基本 CRUD: install/uninstall/toggle/updateConfig
- 验证必填字段 (uuid, name, version)
- 缺少：语言包系统、图标管理、游戏配置注入、主题系统

---

### 2.5 ⚠️ 归档系统 — 缺少 nikkias 格式

**nikki_albums 实现** (`nikkias/`):
- 自定义 `.nikkias` 格式（基于ZIP）
- Manifest 类型分发：`albumBackup` / `imageTransfer` / `other`
- 每种类型有独立的编解码器
- 支持从 nikkias 文件恢复相册备份
- 文件关联（.nikkias 扩展名注册）

**NikkiGallery 实现** (`ArchiveService.ts`):
- 通用 ZIP 压缩/解压
- 使用 archiver/unzipper 库
- 支持进度回调、排除模式
- 但没有 nikkias 特定的 manifest 解析和恢复逻辑

---

## 三、完全对等的功能模块

### 3.1 ✅ 地图系统 — 完全对等

两个项目的地图系统实现高度一致：

| 特性 | nikki_albums | NikkiGallery |
|------|-------------|--------------|
| 地图数量 | 6张 | 6张 (相同ID和名称) |
| 区域数量 | 15个 | 15个 (相同名称和坐标) |
| 坐标变换 | 2点仿射变换 | 2点线性插值 (相同算法) |
| 区域检测 | 射线法 (winding number) | 射线法 (winding number) |
| 高度过滤 | 每区域独立范围 | 每区域独立范围 |
| 参考点数据 | 完全相同 | 完全相同 |
| 多边形顶点 | 完全相同 | 完全相同 |

**算法对比**:
```dart
// nikki_albums - coordToPixel
double pixelX = p1.x + ((p2.x - p1.x) * (coord.x - c1.x)) / (c2.x - c1.x);
double pixelY = p1.y + ((p2.y - p1.y) * (coord.y - c1.y)) / (c2.y - c1.y);
```

```typescript
// NikkiGallery - coordToPixel
const x = rp.p1.x + ((rp.p2.x - rp.p1.x) * (coord.x - rp.c1.x)) / (rp.c2.x - rp.c1.x);
const y = rp.p1.y + ((rp.p2.y - rp.p1.y) * (coord.y - rp.c1.y)) / (rp.c2.y - rp.c1.y);
```

完全相同的数学公式。

---

### 3.2 ✅ 图像解密 — 算法对等

| 步骤 | nikki_albums | NikkiGallery |
|------|-------------|--------------|
| 密钥派生 | SHA1(UTF-16LE(uid)) + "_PAPER_GAMES" → 32字节 | 完全相同 |
| 加密算法 | AES-256-ECB, 无填充 | 完全相同 |
| 文件格式 | JPEG + 0xFFD9 + Base64加密数据 | 完全相同 |
| 实现方式 | Rust FFI (高性能) | Node.js crypto (纯JS) |

密钥派生算法完全一致，只是执行环境不同（Rust vs Node.js）。

---

### 3.3 ✅ 游戏搜索 — 策略对等

两个项目都实现了多策略游戏路径检测：
- 常见安装路径扫描（所有磁盘驱动器）
- Windows 注册表查询（Steam/Epic）
- 文件系统递归搜索
- 截图文件夹自动识别（20+种名称模式）

---

### 3.4 ✅ UID 发现 — 算法对等

两个项目都扫描 `GamePlayPhotos` 目录，匹配 `^\d{6,12}$` 模式的文件夹名作为UID。

---

## 四、NikkiGallery 独有优势

### 4.1 ✅ 去重服务 (DedupService)
- 两级哈希去重：文件大小预筛 → 部分MD5(前64KB) → 完整哈希
- 策略选择：newest/oldest/first/last
- 相似文件名匹配（移除时间戳/序号后匹配）
- nikki_albums 没有独立的去重模块

### 4.2 ✅ 批量操作更丰富
- nikki_albums: 6种内嵌操作（全选/反选/备份/恢复/删除/导入导出）
- NikkiGallery: 9种独立服务（批量重命名/移动/标签管理/导出/收藏/元数据提取/缩略图生成/删除/恢复）

### 4.3 ✅ Web管理面板
- 独立的桌面管理面板 (`desktop/server.js`)
- GPU检测、AI设置、游戏路径配置等

### 4.4 ✅ AI集成架构
- ONNX Runtime 支持
- 多模型图片分析 skill
- AI处理页面

---

## 五、待修复的优先级排序

### P0 — 必须修复（影响核心功能）

1. **nuan5json 解析器**
   - 当前：简化版 JSON.parse，遇到非标准结构会失败
   - 需要：实现完整的 `GameJsonCodec`，支持 `[:key:value]` 格式的 Map
   - 工作量：约200行代码
   - 影响：所有包含非标准JSON的游戏截图元数据解析

### P1 — 应该修复（功能完整性）

2. **图片编辑器参数补全**
   - 缺失10项色彩调整参数
   - 需要在 `ImageEditor.tsx` 中添加对应的 slider 控件和 Canvas 处理逻辑
   - 工作量：约300行代码

3. **实况照片导出**
   - 完全缺失
   - 需要：Google Motion Photo 格式支持（跨平台可行）
   - 工作量：约400行代码

### P2 — 建议修复（体验提升）

4. **插件系统增强**
   - 添加语言包、图标、游戏配置支持
   - 工作量：约200行代码

5. **nikkias 归档格式**
   - 添加 manifest 解析和恢复逻辑
   - 工作量：约300行代码

---

## 六、架构差异说明（非缺陷）

以下差异是两个项目的技术栈选择导致的，不需要修复：

| 方面 | nikki_albums | NikkiGallery | 说明 |
|------|-------------|--------------|------|
| 标签存储 | JSON文件 | SQLite | 各有优势，SQLite更适合查询 |
| 回收站 | 文件系统目录 | 数据库软删除 | 各有优势，数据库更易管理 |
| 状态管理 | Flutter ChangeNotifier | React Zustand | 框架差异 |
| 高性能计算 | Rust FFI | Node.js | Rust更快，但Node.js足够用 |
| UI框架 | Flutter Desktop | React + Tailwind | 完全不同的技术栈 |

---

## 七、结论

NikkiGallery 在**功能覆盖度**上已经达到了 nikki_albums 的约 **85%**。核心差异集中在：

1. **nuan5json 解析器**（P0）— 这是唯一可能导致数据解析失败的问题
2. **图片编辑器参数**（P1）— 功能可用但不完整
3. **实况照片导出**（P1）— 完全缺失的功能

地图系统、图像解密、游戏搜索等核心算法已经**完全对等**实现。
