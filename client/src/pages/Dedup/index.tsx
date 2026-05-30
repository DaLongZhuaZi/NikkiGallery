import { useState, useEffect } from 'react'
import {
  Search,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  HardDrive,
  FileImage,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import {
  detectDuplicates,
  removeDuplicates,
  recycleDuplicates,
  type DedupResult,
  type DuplicateGroup
} from '../../api/dedup'
import { useAccountStore } from '../../stores/useAccountStore'

export default function DedupPage() {
  const { accounts, currentUid } = useAccountStore()

  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<DedupResult | null>(null)
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set())
  const [keepStrategy, setKeepStrategy] = useState<'newest' | 'oldest' | 'first' | 'last'>('newest')
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [processResult, setProcessResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleScan = async () => {
    setIsScanning(true)
    setProcessResult(null)

    try {
      const result = await detectDuplicates({
        uid: currentUid || undefined
      })

      setResult(result)
      setSelectedGroups(new Set(result.groups.map((_, i) => i)))
    } catch (error) {
      setProcessResult({
        type: 'error',
        message: '扫描失败，请检查游戏路径配置'
      })
    }

    setIsScanning(false)
  }

  const handleToggleGroup = (index: number) => {
    const newSelected = new Set(selectedGroups)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedGroups(newSelected)
  }

  const handleSelectAll = () => {
    if (!result) return

    if (selectedGroups.size === result.groups.length) {
      setSelectedGroups(new Set())
    } else {
      setSelectedGroups(new Set(result.groups.map((_, i) => i)))
    }
  }

  const handleToggleExpand = (index: number) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedGroups(newExpanded)
  }

  const handleRemove = async (useRecycleBin: boolean) => {
    if (!result || selectedGroups.size === 0) return

    const confirmMessage = useRecycleBin
      ? `确定要将 ${selectedGroups.size} 组重复文件移动到回收站吗？`
      : `确定要永久删除 ${selectedGroups.size} 组重复文件吗？此操作不可撤销！`

    if (!confirm(confirmMessage)) return

    setIsProcessing(true)
    setProcessResult(null)

    try {
      const selectedGroupData = Array.from(selectedGroups).map(i => result.groups[i])

      if (useRecycleBin) {
        const recycleResult = await recycleDuplicates({
          groups: selectedGroupData,
          keepStrategy
        })

        setProcessResult({
          type: 'success',
          message: `成功移动 ${recycleResult.movedCount} 个文件到回收站，释放 ${formatSize(recycleResult.freedSpace)} 空间`
        })
      } else {
        const removeResult = await removeDuplicates({
          groups: selectedGroupData,
          keepStrategy
        })

        setProcessResult({
          type: 'success',
          message: `成功删除 ${removeResult.deletedCount} 个文件，释放 ${formatSize(removeResult.freedSpace)} 空间`
        })
      }

      // 重新扫描
      await handleScan()
    } catch (error) {
      setProcessResult({
        type: 'error',
        message: '处理失败，请重试'
      })
    }

    setIsProcessing(false)
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#1a1a2e' }}>
      {/* 顶部栏 */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center gap-3">
          <FileImage className="w-6 h-6" style={{ color: '#6366f1' }} />
          <h1 className="text-xl font-semibold" style={{ color: '#ffffff' }}>
            智能去重
          </h1>
          {result && (
            <span
              className="text-sm px-2 py-0.5 rounded-full"
              style={{
                background: result.duplicateGroups > 0
                  ? 'rgba(239, 68, 68, 0.2)'
                  : 'rgba(34, 197, 94, 0.2)',
                color: result.duplicateGroups > 0 ? '#f87171' : '#4ade80'
              }}
            >
              {result.duplicateGroups} 组重复
            </span>
          )}
        </div>

        <button
          onClick={handleScan}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{
            background: '#6366f1',
            color: '#ffffff',
            opacity: isScanning ? 0.5 : 1
          }}
        >
          <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? '扫描中...' : '开始扫描'}</span>
        </button>
      </div>

      {/* 处理结果提示 */}
      {processResult && (
        <div
          className="mx-6 mt-4 p-3 rounded-lg flex items-center justify-between"
          style={{
            background: processResult.type === 'success'
              ? 'rgba(34, 197, 94, 0.2)'
              : 'rgba(239, 68, 68, 0.2)',
            color: processResult.type === 'success' ? '#4ade80' : '#f87171'
          }}
        >
          <div className="flex items-center gap-2">
            {processResult.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span>{processResult.message}</span>
          </div>
          <button
            onClick={() => setProcessResult(null)}
            className="text-sm underline"
          >
            关闭
          </button>
        </div>
      )}

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-6">
        {!result ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Search
              className="w-16 h-16"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            />
            <div className="text-center">
              <p style={{ color: 'rgba(255,255,255,0.6)' }}>
                点击"开始扫描"检测重复图片
              </p>
              <p
                className="text-sm mt-1"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                扫描将基于文件内容哈希进行精确匹配
              </p>
            </div>
          </div>
        ) : result.duplicateGroups === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <CheckCircle
              className="w-16 h-16"
              style={{ color: '#4ade80' }}
            />
            <div className="text-center">
              <p style={{ color: '#ffffff' }}>
                未发现重复图片
              </p>
              <p
                className="text-sm mt-1"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                共扫描 {result.totalFiles} 个文件
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 统计信息 */}
            <div className="grid grid-cols-4 gap-4">
              <div
                className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div
                  className="text-sm"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  扫描文件
                </div>
                <div
                  className="text-2xl font-semibold mt-1"
                  style={{ color: '#ffffff' }}
                >
                  {result.totalFiles}
                </div>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div
                  className="text-sm"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  重复组数
                </div>
                <div
                  className="text-2xl font-semibold mt-1"
                  style={{ color: '#f87171' }}
                >
                  {result.duplicateGroups}
                </div>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div
                  className="text-sm"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  重复文件
                </div>
                <div
                  className="text-2xl font-semibold mt-1"
                  style={{ color: '#f87171' }}
                >
                  {result.duplicateFiles}
                </div>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div
                  className="text-sm"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  浪费空间
                </div>
                <div
                  className="text-2xl font-semibold mt-1"
                  style={{ color: '#f87171' }}
                >
                  {formatSize(result.wastedSpace)}
                </div>
              </div>
            </div>

            {/* 操作栏 */}
            <div
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSelectAll}
                  className="text-sm"
                  style={{ color: '#818cf8' }}
                >
                  {selectedGroups.size === result.groups.length
                    ? '取消全选'
                    : '全选'}
                </button>
                <span
                  className="text-sm"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  已选择 {selectedGroups.size} / {result.groups.length} 组
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    保留策略:
                  </span>
                  <select
                    value={keepStrategy}
                    onChange={e => setKeepStrategy(e.target.value as any)}
                    className="px-3 py-1.5 rounded-lg text-sm"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <option value="newest">保留最新</option>
                    <option value="oldest">保留最旧</option>
                    <option value="first">保留第一个</option>
                    <option value="last">保留最后一个</option>
                  </select>
                </div>

                <button
                  onClick={() => handleRemove(true)}
                  disabled={isProcessing || selectedGroups.size === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    background: 'rgba(234, 179, 8, 0.2)',
                    color: '#fbbf24',
                    opacity: isProcessing || selectedGroups.size === 0 ? 0.5 : 1
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>移到回收站</span>
                </button>

                <button
                  onClick={() => handleRemove(false)}
                  disabled={isProcessing || selectedGroups.size === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    opacity: isProcessing || selectedGroups.size === 0 ? 0.5 : 1
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>永久删除</span>
                </button>
              </div>
            </div>

            {/* 重复组列表 */}
            <div className="space-y-3">
              {result.groups.map((group, index) => (
                <div
                  key={group.hash}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: selectedGroups.has(index)
                      ? '1px solid rgba(99, 102, 241, 0.3)'
                      : '1px solid transparent'
                  }}
                >
                  {/* 组头 */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer"
                    onClick={() => handleToggleExpand(index)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.has(index)}
                      onChange={() => handleToggleGroup(index)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4"
                    />

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span style={{ color: '#ffffff' }}>
                          {group.files.length} 个重复文件
                        </span>
                        <span
                          className="text-sm"
                          style={{ color: 'rgba(255,255,255,0.4)' }}
                        >
                          ({formatSize(group.files[0].size)})
                        </span>
                      </div>
                    </div>

                    {expandedGroups.has(index) ? (
                      <ChevronUp
                        className="w-5 h-5"
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                      />
                    ) : (
                      <ChevronDown
                        className="w-5 h-5"
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                      />
                    )}
                  </div>

                  {/* 展开的文件列表 */}
                  {expandedGroups.has(index) && (
                    <div
                      className="border-t px-4 pb-4"
                      style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                    >
                      {group.files.map((file, fileIndex) => (
                        <div
                          key={file.path}
                          className="flex items-center gap-4 py-2"
                        >
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center"
                            style={{ background: 'rgba(255,255,255,0.05)' }}
                          >
                            <FileImage
                              className="w-4 h-4"
                              style={{ color: 'rgba(255,255,255,0.4)' }}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div
                              className="text-sm truncate"
                              style={{ color: '#ffffff' }}
                            >
                              {file.filename}
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: 'rgba(255,255,255,0.4)' }}
                            >
                              {file.album}
                            </div>
                          </div>

                          <div
                            className="text-sm"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                          >
                            {new Date(file.lastModified).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
