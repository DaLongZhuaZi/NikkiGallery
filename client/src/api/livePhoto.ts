import axios from 'axios'

const API_BASE = '/api/live-photo'

export interface ExportResult {
  outputPath: string
}

export interface BatchExportResult {
  exported: number
  failed: number
  errors: string[]
  results: ExportResult[]
}

export interface PairedFile {
  coverImage: string
  video: string
  basename: string
}

export interface FindPairsResult {
  pairs: PairedFile[]
  count: number
}

/** 导出单个实况照片 */
export async function exportLivePhoto(
  coverImagePath: string,
  videoPath: string,
  outputPath?: string,
): Promise<ExportResult> {
  const res = await axios.post(`${API_BASE}/export`, {
    coverImagePath,
    videoPath,
    outputPath,
  })
  return res.data.data
}

/** 批量导出目录中的实况照片 */
export async function batchExportLivePhotos(
  inputDir: string,
  outputDir?: string,
): Promise<BatchExportResult> {
  const res = await axios.post(`${API_BASE}/batch-export`, {
    inputDir,
    outputDir,
  })
  return res.data.data
}

/** 查找目录中配对的图片和视频 */
export async function findPairedFiles(directory: string): Promise<FindPairsResult> {
  const res = await axios.post(`${API_BASE}/find-pairs`, { directory })
  return res.data.data
}
