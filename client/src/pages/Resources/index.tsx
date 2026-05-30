import { useEffect, useState } from 'react'
import {
  Image,
  Film,
  FolderOpen,
  RefreshCw,
  HardDrive,
  Calendar,
  File,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react'
import { useResourceStore, ResourceType, ResourceFile } from '../../stores/useResourceStore'
import { getResourceFileUrl } from '../../api/resources'
import { formatBytes, formatDate } from '../../utils/format'

const resourceTypeIcons: Record<ResourceType, typeof Image> = {
  [ResourceType.LauncherCacheImages]: Image,
  [ResourceType.MallPic]: Image,
  [ResourceType.Movies]: Film
}

const resourceTypeColors: Record<ResourceType, string> = {
  [ResourceType.LauncherCacheImages]: 'from-blue-500 to-cyan-500',
  [ResourceType.MallPic]: 'from-purple-500 to-pink-500',
  [ResourceType.Movies]: 'from-orange-500 to-red-500'
}

export default function ResourcesPage() {
  const {
    resourceTypes,
    selectedType,
    scanResult,
    isLoading,
    isScanning,
    error,
    loadResourceTypes,
    setSelectedType,
    scanCurrentType,
    clearError
  } = useResourceStore()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [previewFile, setPreviewFile] = useState<ResourceFile | null>(null)

  useEffect(() => {
    loadResourceTypes()
  }, [loadResourceTypes])

  const selectedTypeInfo = resourceTypes.find(t => t.type === selectedType)
  const Icon = resourceTypeIcons[selectedType]
  const gradientColor = resourceTypeColors[selectedType]

  const handleScan = () => {
    scanCurrentType()
  }

  const handleOpenFolder = () => {
    if (scanResult?.path) {
      // 在新窗口中打开文件夹（通过后端API）
      window.open(`/api/resources/open-folder?path=${encodeURIComponent(scanResult.path)}`, '_blank')
    }
  }

  const handlePreview = (file: ResourceFile) => {
    if (selectedTypeInfo?.isImage) {
      setPreviewFile(file)
    } else {
      // 对于视频文件，直接打开
      window.open(getResourceFileUrl(file.path), '_blank')
    }
  }

  const handleClosePreview = () => {
    setPreviewFile(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 头部 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">游戏资源查看</h1>
        <p className="text-gray-600 mt-1">查看游戏安装目录中的资源文件</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-red-800">{error}</span>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 资源类型选择 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {resourceTypes.map((typeInfo) => {
          const TypeIcon = resourceTypeIcons[typeInfo.type]
          const isSelected = selectedType === typeInfo.type

          return (
            <button
              key={typeInfo.type}
              onClick={() => setSelectedType(typeInfo.type)}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${resourceTypeColors[typeInfo.type]}`}>
                  <TypeIcon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">{typeInfo.name}</h3>
                  <p className="text-sm text-gray-500">{typeInfo.description}</p>
                </div>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* 操作栏 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleScan}
              disabled={isScanning}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isScanning
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-md'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? '扫描中...' : '扫描资源'}
            </button>

            {scanResult?.path && (
              <button
                onClick={handleOpenFolder}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                打开文件夹
              </button>
            )}
          </div>

          {scanResult && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg ${
                    viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg ${
                    viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <div className="text-sm text-gray-500">
                共 {scanResult.files.length} 个文件，{formatBytes(scanResult.totalSize)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 扫描结果 */}
      {scanResult && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* 结果头部 */}
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${gradientColor}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedTypeInfo?.name}</h3>
                  <p className="text-sm text-gray-500">{scanResult.path || '路径不可用'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <File className="w-4 h-4" />
                  <span>{scanResult.files.length} 个文件</span>
                </div>
                <div className="flex items-center gap-1">
                  <HardDrive className="w-4 h-4" />
                  <span>{formatBytes(scanResult.totalSize)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 文件列表 */}
          {scanResult.files.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">未找到资源文件</p>
              <p className="text-sm mt-1">
                {scanResult.path
                  ? '该目录下没有找到匹配的文件'
                  : '请先设置游戏安装路径'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {scanResult.files.map((file, index) => (
                <div
                  key={index}
                  onClick={() => handlePreview(file)}
                  className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                >
                  {selectedTypeInfo?.isImage ? (
                    <img
                      src={getResourceFileUrl(file.path)}
                      alt={file.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <Film className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate">{file.filename}</p>
                    <p className="text-gray-300 text-xs">{formatBytes(file.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {scanResult.files.map((file, index) => (
                <div
                  key={index}
                  onClick={() => handlePreview(file)}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                    {selectedTypeInfo?.isImage ? (
                      <img
                        src={getResourceFileUrl(file.path)}
                        alt={file.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <Film className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{file.filename}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {formatBytes(file.size)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(file.lastModified)}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 图片预览模态框 */}
      {previewFile && selectedTypeInfo?.isImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={handleClosePreview}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={getResourceFileUrl(previewFile.path)}
              alt={previewFile.filename}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent rounded-b-lg">
              <p className="text-white font-medium">{previewFile.filename}</p>
              <p className="text-gray-300 text-sm">
                {formatBytes(previewFile.size)} • {formatDate(previewFile.lastModified)}
              </p>
            </div>
            <button
              onClick={handleClosePreview}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600">加载中...</span>
        </div>
      )}
    </div>
  )
}
