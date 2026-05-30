import { useState } from 'react'
import { Copy, Edit, Trash2, ExternalLink, Palette, Home, Camera, Puzzle } from 'lucide-react'
import { ShareCode } from '@/types/share'
import { useShareStore } from '@/stores/useShareStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface ShareCardProps {
  shareCode: ShareCode
}

const typeConfig = {
  dye: {
    label: '染色码',
    icon: Palette,
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-600',
  },
  home: {
    label: '家园码',
    icon: Home,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  camera: {
    label: '相机码',
    icon: Camera,
    color: 'from-purple-500 to-violet-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
  diy: {
    label: 'DIY码',
    icon: Puzzle,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
  },
  combo: {
    label: '套装码',
    icon: ExternalLink,
    color: 'from-orange-500 to-amber-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-600',
  },
}

export default function ShareCard({ shareCode }: ShareCardProps) {
  const { copyShareCode, deleteShareCode } = useShareStore()
  const [isCopied, setIsCopied] = useState(false)
  const config = typeConfig[shareCode.type]

  const handleCopy = async () => {
    try {
      await copyShareCode(shareCode.code)
      setIsCopied(true)
      toast.success('分享码已复制到剪贴板')
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      toast.error('复制失败')
    }
  }

  const handleDelete = async () => {
    if (window.confirm('确定要删除这个分享码吗？')) {
      try {
        await deleteShareCode(shareCode.id)
        toast.success('分享码已删除')
      } catch (error) {
        toast.error('删除失败')
      }
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* 头部 */}
      <div className={`bg-gradient-to-r ${config.color} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <config.icon className="w-5 h-5 text-white" />
            <span className="text-white font-medium">{config.label}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="p-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              title="复制"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              title="编辑"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 内容 */}
      <div className="p-4">
        {shareCode.name && (
          <h3 className="font-semibold text-gray-900 mb-2">{shareCode.name}</h3>
        )}
        
        {shareCode.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{shareCode.description}</p>
        )}

        {/* 分享码显示 */}
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between">
            <code className="text-sm font-mono text-gray-700 break-all">
              {shareCode.code}
            </code>
            <button
              onClick={handleCopy}
              className={clsx(
                'ml-2 px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                isCopied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-pink-100 text-pink-700 hover:bg-pink-200'
              )}
            >
              {isCopied ? '已复制' : '复制'}
            </button>
          </div>
        </div>

        {/* 元数据 */}
        {shareCode.metadata && (
          <div className="text-xs text-gray-500">
            <p>角色ID: {shareCode.roleId || '未知'}</p>
            <p>创建时间: {new Date(shareCode.createdAt).toLocaleDateString('zh-CN')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
