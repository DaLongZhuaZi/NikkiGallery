import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'

const MODELS_DIR = path.join(__dirname, '../models')

// 模型配置
const MODELS = [
  {
    id: 'mobilenet-v3',
    name: 'MobileNet V3 Small (分类器)',
    filename: 'classifier.onnx',
    url: 'https://github.com/onnx/models/raw/main/validated/vision/classification/mobilenet/model/mobilenetv3-small-12.onnx',
    size: '~6.8 MB',
    description: '轻量级图像分类模型，用于场景和服装识别',
  },
  {
    id: 'yolov8-nano',
    name: 'YOLOv8 Nano (检测器)',
    filename: 'detector.onnx',
    url: 'https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.onnx',
    size: '~6.2 MB',
    description: '超轻量目标检测模型，用于人物和服装检测',
  },
  {
    id: 'resnet18',
    name: 'ResNet-18 (特征提取)',
    filename: 'feature_extractor.onnx',
    url: 'https://github.com/onnx/models/raw/main/validated/vision/classification/resnet/model/resnet18-v2-7.onnx',
    size: '~44.7 MB',
    description: '深度特征提取模型，用于以图搜图和相似度计算',
  },
]

/**
 * 下载文件
 */
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(destPath)

    const request = protocol.get(url, (response) => {
      // 处理重定向
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          file.close()
          fs.unlinkSync(destPath)
          return downloadFile(redirectUrl, destPath).then(resolve).catch(reject)
        }
      }

      if (response.statusCode !== 200) {
        file.close()
        fs.unlinkSync(destPath)
        reject(new Error(`Download failed with status ${response.statusCode}`))
        return
      }

      const totalSize = parseInt(response.headers['content-length'] || '0', 10)
      let downloadedSize = 0

      response.on('data', (chunk) => {
        downloadedSize += chunk.length
        if (totalSize > 0) {
          const percent = Math.round((downloadedSize / totalSize) * 100)
          process.stdout.write(`\r  下载进度: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(1)} MB / ${(totalSize / 1024 / 1024).toFixed(1)} MB)`)
        }
      })

      response.pipe(file)

      file.on('finish', () => {
        file.close()
        console.log('') // 换行
        resolve()
      })
    })

    request.on('error', (err) => {
      file.close()
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath)
      }
      reject(err)
    })

    file.on('error', (err) => {
      file.close()
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath)
      }
      reject(err)
    })
  })
}

/**
 * 主函数
 */
async function main() {
  console.log('=== NikkiGallery AI 模型下载工具 ===\n')

  // 确保模型目录存在
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true })
    console.log(`创建模型目录: ${MODELS_DIR}\n`)
  }

  // 检查命令行参数
  const args = process.argv.slice(2)
  const specificModel = args[0] // 可选：指定下载某个模型

  const modelsToDownload = specificModel
    ? MODELS.filter(m => m.id === specificModel || m.filename === specificModel)
    : MODELS

  if (modelsToDownload.length === 0) {
    console.error(`未找到模型: ${specificModel}`)
    console.log('\n可用模型:')
    MODELS.forEach(m => {
      console.log(`  - ${m.id} (${m.filename}): ${m.name}`)
    })
    process.exit(1)
  }

  let successCount = 0
  let failCount = 0

  for (const model of modelsToDownload) {
    const destPath = path.join(MODELS_DIR, model.filename)

    // 检查是否已存在
    if (fs.existsSync(destPath)) {
      const stat = fs.statSync(destPath)
      console.log(`✓ ${model.name} 已存在 (${(stat.size / 1024 / 1024).toFixed(1)} MB)`)
      successCount++
      continue
    }

    console.log(`\n下载: ${model.name}`)
    console.log(`  文件: ${model.filename}`)
    console.log(`  大小: ${model.size}`)
    console.log(`  说明: ${model.description}`)
    console.log(`  来源: ${model.url}`)

    try {
      await downloadFile(model.url, destPath)
      const stat = fs.statSync(destPath)
      console.log(`  ✓ 下载完成 (${(stat.size / 1024 / 1024).toFixed(1)} MB)`)
      successCount++
    } catch (error: any) {
      console.error(`  ✗ 下载失败: ${error.message}`)
      failCount++
    }
  }

  console.log('\n=== 下载完成 ===')
  console.log(`成功: ${successCount}, 失败: ${failCount}`)

  if (failCount > 0) {
    console.log('\n提示: 下载失败可能是因为网络问题，请检查网络连接后重试。')
    console.log('也可以手动下载模型文件并放置到:', MODELS_DIR)
    process.exit(1)
  }
}

main().catch(console.error)
