import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'
import { Upload, Check, FileUp, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ReceivePage() {
  const { taskId } = useParams<{ taskId: string }>()
  const { scheme } = useTheme()

  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; name: string; size: number }>>([])
  const [taskInfo, setTaskInfo] = useState<{
    status: string
    files: Array<{ id: string; name: string; size: number }>
  } | null>(null)

  // 获取任务信息
  useEffect(() => {
    if (!taskId) return

    const fetchTaskInfo = async () => {
      try {
        const response = await fetch(`/api/transfer/task/${taskId}`)
        if (response.ok) {
          const data = await response.json()
          setTaskInfo(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch task info:', error)
      }
    }

    fetchTaskInfo()
  }, [taskId])

  // 处理文件上传
  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!taskId) return

    setIsUploading(true)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append('file', file)

      try {
        const port = window.location.port || '14000'
        const host = window.location.hostname
        const response = await fetch(`http://${host}:${port}/transfer/upload/${taskId}`, {
          method: 'POST',
          body: file,
          headers: {
            'X-File-Name': encodeURIComponent(file.name),
            'Content-Type': file.type || 'application/octet-stream',
          },
        })

        if (response.ok) {
          const result = await response.json()
          setUploadedFiles(prev => [...prev, result.file])
          toast.success(`${file.name} 上传成功`)
        } else {
          toast.error(`${file.name} 上传失败`)
        }
      } catch (error) {
        console.error('Upload error:', error)
        toast.error(`${file.name} 上传失败`)
      }
    }

    setIsUploading(false)
  }, [taskId])

  // 拖拽上传
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }, [handleFileUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  // 格式化文件大小
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: scheme.bgMain }}
    >
      <div className="w-full max-w-md">
        {/* 标题 */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: scheme.primaryLight }}
          >
            <FileUp className="w-8 h-8" style={{ color: scheme.primary }} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: scheme.textPrimary }}>
            文件上传
          </h1>
          <p className="text-sm" style={{ color: scheme.textSecondary }}>
            选择文件上传到接收端
          </p>
        </div>

        {/* 上传区域 */}
        <div
          className="rounded-xl p-8 mb-6"
          style={{ background: scheme.bgCard }}
        >
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
            style={{
              borderColor: scheme.borderLight,
              background: isUploading ? scheme.bgHover : 'transparent',
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.multiple = true
              input.onchange = (e) => {
                const target = e.target as HTMLInputElement
                if (target.files) {
                  handleFileUpload(target.files)
                }
              }
              input.click()
            }}
          >
            {isUploading ? (
              <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: scheme.primary }} />
            ) : (
              <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: scheme.textSecondary }} />
            )}

            <p className="font-medium mb-2" style={{ color: scheme.textPrimary }}>
              {isUploading ? '上传中...' : '点击或拖拽文件到此处'}
            </p>
            <p className="text-sm" style={{ color: scheme.textSecondary }}>
              支持任意文件格式
            </p>
          </div>
        </div>

        {/* 已上传文件列表 */}
        {uploadedFiles.length > 0 && (
          <div
            className="rounded-xl p-4"
            style={{ background: scheme.bgCard }}
          >
            <h3 className="font-medium mb-3" style={{ color: scheme.textPrimary }}>
              已上传文件
            </h3>
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: scheme.bgHover }}
                >
                  <Check className="w-4 h-4 text-green-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: scheme.textPrimary }}>
                      {file.name}
                    </p>
                    <p className="text-xs" style={{ color: scheme.textSecondary }}>
                      {formatSize(file.size)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 任务信息 */}
        {taskInfo && (
          <div
            className="rounded-xl p-4 mt-4"
            style={{ background: scheme.bgCard }}
          >
            <h3 className="font-medium mb-3" style={{ color: scheme.textPrimary }}>
              任务信息
            </h3>
            <div className="space-y-2 text-sm" style={{ color: scheme.textSecondary }}>
              <p>状态: {taskInfo.status === 'active' ? '进行中' : taskInfo.status}</p>
              <p>文件数: {taskInfo.files.length}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
