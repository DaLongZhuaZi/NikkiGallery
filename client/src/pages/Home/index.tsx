import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Image, Share2, Cpu, Heart, Trash2, ArrowRight,
  Clock, Tag, Activity, Shirt, FolderOpen, Sparkles, Calendar,
  CheckCircle2, AlertCircle, Loader2, XCircle
} from 'lucide-react'
import { useAlbumStore } from '@/stores/useAlbumStore'
import { useImageStore } from '@/stores/useImageStore'
import { useShareStore } from '@/stores/useShareStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { useTheme } from '@/contexts/ThemeContext'
import { getPopularTags, Tag as TagType } from '@/api/tags'
import { getWardrobeDetail, WardrobeItem } from '@/api/image'

// 根据小时生成问候语
function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours()
  if (h < 6) return { text: '夜深了', emoji: '🌙' }
  if (h < 9) return { text: '早上好', emoji: '☀️' }
  if (h < 12) return { text: '上午好', emoji: '🌤️' }
  if (h < 14) return { text: '中午好', emoji: '🌞' }
  if (h < 18) return { text: '下午好', emoji: '⛅' }
  if (h < 22) return { text: '晚上好', emoji: '🌆' }
  return { text: '夜深了', emoji: '🌙' }
}

// 格式化日期
function formatDate(): string {
  const d = new Date()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${weekdays[d.getDay()]}`
}

// 任务状态图标
function TaskStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    case 'failed': return <XCircle className="w-4 h-4 text-red-400" />
    case 'running': return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
    case 'cancelled': return <AlertCircle className="w-4 h-4 text-yellow-400" />
    default: return <Clock className="w-4 h-4 text-gray-400" />
  }
}

// 任务类型中文映射
const TASK_TYPE_LABELS: Record<string, string> = {
  scan_albums: '扫描相册',
  scan_images: '扫描图片',
  extract_metadata: '提取元数据',
  generate_thumbnail: '生成缩略图',
  ai_process: 'AI处理',
  batch_operation: '批量操作',
  import_images: '导入图片',
  export_images: '导出图片',
  dedup: '去重检测',
  decrypt: '解密',
  custom: '自定义',
}

// 分享码类型中文映射
const SHARE_TYPE_LABELS: Record<string, string> = {
  dye: '染色码',
  home: '家园码',
  camera: '相机码',
  combo: '搭配码',
  diy: 'DIY码',
}

// 分享码类型颜色
const SHARE_TYPE_COLORS: Record<string, string> = {
  dye: '#f472b6',
  home: '#60a5fa',
  camera: '#34d399',
  combo: '#fbbf24',
  diy: '#a78bfa',
}

export default function HomePage() {
  const navigate = useNavigate()
  const { scheme } = useTheme()
  const { albums, fetchAlbums } = useAlbumStore()
  const { images, fetchImages, imageStats, fetchImageStats } = useImageStore()
  const { shareCodes, fetchShareCodes } = useShareStore()
  const { tasks, fetchTasks } = useTaskStore()
  const [loaded, setLoaded] = useState(false)
  const [popularTags, setPopularTags] = useState<TagType[]>([])
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([])

  useEffect(() => {
    fetchAlbums()
    fetchImages()
    fetchImageStats()
    fetchShareCodes()
    fetchTasks()

    // 异步加载额外数据
    getPopularTags(12)
      .then(tags => setPopularTags(tags || []))
      .catch(() => {})

    getWardrobeDetail()
      .then(items => setWardrobeItems(items || []))
      .catch(() => {})

    const timer = setTimeout(() => setLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [fetchAlbums, fetchImages, fetchImageStats, fetchShareCodes, fetchTasks])

  // 统计信息
  const greeting = getGreeting()
  const wardrobeCount = wardrobeItems.length

  // 分享码按类型统计
  const shareByType = useMemo(() => {
    const map: Record<string, number> = {}
    shareCodes.forEach(s => {
      map[s.type] = (map[s.type] || 0) + 1
    })
    return map
  }, [shareCodes])

  // 最近完成的任务
  const recentTasks = useMemo(() => {
    return tasks
      .filter(t => t.status === 'completed' || t.status === 'failed')
      .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
      .slice(0, 6)
  }, [tasks])

  // 正在运行的任务
  const runningTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'running').slice(0, 3)
  }, [tasks])

  // 相册按图片数量排序，取前6个
  const topAlbums = useMemo(() => {
    return [...albums]
      .sort((a, b) => b.imageCount - a.imageCount)
      .slice(0, 6)
  }, [albums])

  const recentImages = images.slice(0, 12)

  // 格式化相对时间
  const formatRelativeTime = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins}分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}天前`
    return new Date(dateStr).toLocaleDateString('zh-CN')
  }

  return (
    <div className="page-transition max-w-7xl mx-auto px-1">
      {/* ========== 欢迎区域 ========== */}
      <div
        className="mb-8 p-6 rounded-2xl relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${scheme.primary}18, ${scheme.gradientEnd}12)`,
          border: `1px solid ${scheme.borderLight}`,
        }}
      >
        {/* 装饰圆 */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10"
          style={{ background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})` }} />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full opacity-5"
          style={{ background: scheme.primary }} />

        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl animate-float">{greeting.emoji}</span>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: scheme.textPrimary }}>
                {greeting.text}，
                <span style={{
                  background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>暖暖</span>
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <Calendar className="w-3.5 h-3.5" style={{ color: scheme.textTertiary }} />
                <p className="text-sm" style={{ color: scheme.textSecondary }}>{formatDate()}</p>
              </div>
              <p className="text-sm mt-1" style={{ color: scheme.textSecondary }}>
                已管理 <strong style={{ color: scheme.primary }}>{imageStats.total}</strong> 张图片，
                <strong style={{ color: scheme.primary }}>{albums.length}</strong> 个相册
                {imageStats.favorites > 0 && <>，<strong style={{ color: '#f472b6' }}>{imageStats.favorites}</strong> 张收藏</>}
              </p>
            </div>
          </div>

          {/* 右侧快速状态指示 */}
          <div className="hidden sm:flex items-center gap-3">
            {runningTasks.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: `${scheme.info}15`, color: scheme.info }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {runningTasks.length} 个任务进行中
              </div>
            )}
            {imageStats.trash > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer"
                style={{ background: `${scheme.warning}15`, color: scheme.warning }}
                onClick={() => navigate('/trash')}>
                <Trash2 className="w-3.5 h-3.5" />
                回收站 {imageStats.trash} 张
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========== 统计卡片（6个） ========== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {[
          { name: '相册', value: albums.length, icon: FolderOpen, color: scheme.primary, route: '/gallery' },
          { name: '图片', value: imageStats.total, icon: Image, color: scheme.info, route: '/gallery' },
          { name: '收藏', value: imageStats.favorites, icon: Heart, color: '#f472b6', route: '/gallery' },
          { name: 'AI处理', value: imageStats.aiProcessed, icon: Cpu, color: '#a78bfa', route: '/ai-process' },
          { name: '分享码', value: shareCodes.length, icon: Share2, color: scheme.success, route: '/share-codes' },
          { name: '衣柜', value: wardrobeCount, icon: Shirt, color: '#fbbf24', route: '/wardrobe' },
        ].map((stat, index) => (
          <div
            key={stat.name}
            className="theme-card p-4 cursor-pointer stagger-item group"
            style={{
              animationDelay: `${index * 60}ms`,
              opacity: loaded ? 1 : 0,
            }}
            onClick={() => navigate(stat.route)}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-lg transition-transform group-hover:scale-110"
                style={{ background: `${stat.color}18` }}>
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
            </div>
            <p className="text-xs font-medium mb-0.5" style={{ color: scheme.textSecondary }}>{stat.name}</p>
            <p className="text-xl font-bold" style={{ color: scheme.textPrimary }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ========== 双列：相册概览 + 热门标签 ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        {/* 相册概览（3列宽） */}
        <div className="lg:col-span-3 theme-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" style={{ color: scheme.primary }} />
              <h2 className="text-base font-semibold" style={{ color: scheme.textPrimary }}>相册概览</h2>
            </div>
            <button
              onClick={() => navigate('/gallery')}
              className="flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: scheme.primary }}
            >
              全部 <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {topAlbums.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {topAlbums.map((album, index) => (
                <div
                  key={album.id}
                  className="group cursor-pointer stagger-item"
                  style={{ animationDelay: `${index * 80 + 200}ms` }}
                  onClick={() => navigate(`/gallery/${album.id}`)}
                >
                  <div className="aspect-[4/3] rounded-xl overflow-hidden mb-2 relative"
                    style={{ background: scheme.bgHover, border: `1px solid ${scheme.borderLight}` }}>
                    {album.coverImageId ? (
                      <img
                        src={`/api/images/${album.coverImageId}/thumbnail?size=medium`}
                        alt={album.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-8 h-8" style={{ color: scheme.textTertiary }} />
                      </div>
                    )}
                    {/* 图片数量角标 */}
                    <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white backdrop-blur-sm"
                      style={{ background: 'rgba(0,0,0,0.55)' }}>
                      {album.imageCount}
                    </div>
                  </div>
                  <p className="text-sm font-medium truncate" style={{ color: scheme.textPrimary }}>{album.name}</p>
                  <p className="text-xs" style={{ color: scheme.textTertiary }}>
                    {album.type === 'game' ? '游戏相册' : '自定义相册'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state py-10">
              <FolderOpen className="w-10 h-10 mb-2" style={{ color: scheme.textTertiary }} />
              <p className="text-sm" style={{ color: scheme.textSecondary }}>暂无相册</p>
              <p className="text-xs mt-1" style={{ color: scheme.textTertiary }}>点击"扫描"导入游戏相册</p>
            </div>
          )}
        </div>

        {/* 热门标签（2列宽） */}
        <div className="lg:col-span-2 theme-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4" style={{ color: '#a78bfa' }} />
              <h2 className="text-base font-semibold" style={{ color: scheme.textPrimary }}>热门标签</h2>
            </div>
            <button
              onClick={() => navigate('/tags')}
              className="flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: scheme.primary }}
            >
              管理 <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {popularTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag, index) => (
                <div
                  key={tag.id}
                  className="stagger-item flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-all hover:scale-105"
                  style={{
                    animationDelay: `${index * 40 + 300}ms`,
                    background: `${SHARE_TYPE_COLORS[tag.type] || scheme.primary}18`,
                    color: SHARE_TYPE_COLORS[tag.type] || scheme.primary,
                    border: `1px solid ${SHARE_TYPE_COLORS[tag.type] || scheme.primary}30`,
                  }}
                  onClick={() => navigate('/tags')}
                >
                  <span className="font-medium">{tag.nameZh}</span>
                  <span className="text-xs opacity-60">{tag.usageCount}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state py-8">
              <Tag className="w-8 h-8 mb-2" style={{ color: scheme.textTertiary }} />
              <p className="text-sm" style={{ color: scheme.textSecondary }}>暂无标签</p>
              <p className="text-xs mt-1" style={{ color: scheme.textTertiary }}>AI识别后自动生成标签</p>
            </div>
          )}

          {/* 分享码类型分布 */}
          {shareCodes.length > 0 && (
            <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${scheme.borderLight}` }}>
              <div className="flex items-center gap-2 mb-3">
                <Share2 className="w-3.5 h-3.5" style={{ color: scheme.success }} />
                <h3 className="text-sm font-medium" style={{ color: scheme.textPrimary }}>分享码分布</h3>
              </div>
              <div className="space-y-2">
                {Object.entries(shareByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: SHARE_TYPE_COLORS[type] || scheme.primary }} />
                      <span className="text-sm" style={{ color: scheme.textSecondary }}>
                        {SHARE_TYPE_LABELS[type] || type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: scheme.bgHover }}>
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min((count / shareCodes.length) * 100, 100)}%`,
                            background: SHARE_TYPE_COLORS[type] || scheme.primary,
                          }} />
                      </div>
                      <span className="text-xs font-medium w-6 text-right" style={{ color: scheme.textSecondary }}>
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== 最近图片 ========== */}
      <div className="theme-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: scheme.primary }} />
            <h2 className="text-base font-semibold" style={{ color: scheme.textPrimary }}>最近图片</h2>
          </div>
          <button
            onClick={() => navigate('/gallery')}
            className="flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: scheme.primary }}
          >
            查看全部 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentImages.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {recentImages.map((image, index) => (
              <div
                key={image.id}
                className="aspect-square rounded-xl overflow-hidden cursor-pointer stagger-item group relative"
                style={{
                  animationDelay: `${index * 50 + 400}ms`,
                  background: scheme.bgHover,
                  border: `1px solid ${scheme.borderLight}`,
                }}
                onClick={() => navigate(`/gallery/${image.albumId}`)}
              >
                <img
                  src={`/api/images/${image.id}/thumbnail?size=small`}
                  alt={image.filename}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
                {/* 收藏标识 */}
                {image.favorite && (
                  <div className="absolute top-1.5 right-1.5">
                    <Heart className="w-3.5 h-3.5 fill-pink-400 text-pink-400" />
                  </div>
                )}
                {/* AI处理标识 */}
                {image.aiProcessed && (
                  <div className="absolute bottom-1.5 left-1.5">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state py-10">
            <Image className="w-10 h-10 mb-2" style={{ color: scheme.textTertiary }} />
            <p className="text-sm font-medium" style={{ color: scheme.textSecondary }}>暂无图片</p>
            <p className="text-xs mt-1" style={{ color: scheme.textTertiary }}>扫描游戏相册以导入图片</p>
          </div>
        )}
      </div>

      {/* ========== 双列：最近活动 + 衣柜概览 ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* 最近任务活动 */}
        <div className="theme-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4" style={{ color: scheme.info }} />
            <h2 className="text-base font-semibold" style={{ color: scheme.textPrimary }}>最近活动</h2>
          </div>

          {recentTasks.length > 0 || runningTasks.length > 0 ? (
            <div className="space-y-2.5">
              {/* 进行中的任务 */}
              {runningTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl transition-colors"
                  style={{ background: `${scheme.info}08`, border: `1px solid ${scheme.info}20` }}>
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: scheme.textPrimary }}>
                      {TASK_TYPE_LABELS[task.type] || task.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: scheme.bgHover }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${task.totalItems > 0 ? (task.processedItems / task.totalItems) * 100 : 0}%`,
                            background: scheme.info,
                          }} />
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: scheme.textTertiary }}>
                        {task.processedItems}/{task.totalItems}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* 已完成/失败的任务 */}
              {recentTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:opacity-80"
                  style={{ background: scheme.bgCard }}>
                  <TaskStatusIcon status={task.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: scheme.textPrimary }}>
                      {TASK_TYPE_LABELS[task.type] || task.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: scheme.textTertiary }}>
                      {task.status === 'completed'
                        ? `处理了 ${task.processedItems} 项`
                        : task.error || '执行失败'}
                    </p>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: scheme.textTertiary }}>
                    {formatRelativeTime(task.completedAt || task.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state py-8">
              <Activity className="w-8 h-8 mb-2" style={{ color: scheme.textTertiary }} />
              <p className="text-sm" style={{ color: scheme.textSecondary }}>暂无活动记录</p>
              <p className="text-xs mt-1" style={{ color: scheme.textTertiary }}>扫描或AI处理后将显示在这里</p>
            </div>
          )}
        </div>

        {/* 衣柜概览 */}
        <div className="theme-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shirt className="w-4 h-4" style={{ color: '#fbbf24' }} />
              <h2 className="text-base font-semibold" style={{ color: scheme.textPrimary }}>衣柜概览</h2>
            </div>
            <button
              onClick={() => navigate('/wardrobe')}
              className="flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: scheme.primary }}
            >
              查看全部 <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {wardrobeItems.length > 0 ? (
            <>
              {/* 衣柜总览 */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 rounded-xl" style={{ background: `${scheme.warning}10` }}>
                  <p className="text-lg font-bold" style={{ color: scheme.warning }}>{wardrobeItems.length}</p>
                  <p className="text-xs" style={{ color: scheme.textSecondary }}>服装总数</p>
                </div>
                <div className="text-center p-3 rounded-xl" style={{ background: `${scheme.info}10` }}>
                  <p className="text-lg font-bold" style={{ color: scheme.info }}>
                    {wardrobeItems.reduce((sum, w) => sum + w.imageCount, 0)}
                  </p>
                  <p className="text-xs" style={{ color: scheme.textSecondary }}>服装图片</p>
                </div>
                <div className="text-center p-3 rounded-xl" style={{ background: `${scheme.success}10` }}>
                  <p className="text-lg font-bold" style={{ color: scheme.success }}>
                    {wardrobeItems.filter(w => w.customCoverImageId).length}
                  </p>
                  <p className="text-xs" style={{ color: scheme.textSecondary }}>自定义封面</p>
                </div>
              </div>

              {/* 衣柜预览（前4个有封面的） */}
              <div className="grid grid-cols-4 gap-2.5">
                {wardrobeItems
                  .filter(w => w.coverImageId)
                  .slice(0, 4)
                  .map((item, index) => (
                    <div
                      key={item.clothesId}
                      className="aspect-[3/4] rounded-xl overflow-hidden cursor-pointer stagger-item group relative"
                      style={{
                        animationDelay: `${index * 60 + 500}ms`,
                        background: scheme.bgHover,
                        border: `1px solid ${scheme.borderLight}`,
                      }}
                      onClick={() => navigate('/wardrobe')}
                    >
                      <img
                        src={`/api/images/${item.customCoverImageId || item.coverImageId}/thumbnail?size=small`}
                        alt={`服装 ${item.clothesId}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent">
                        <p className="text-xs text-white font-medium text-center">{item.imageCount} 张</p>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="empty-state py-8">
              <Shirt className="w-8 h-8 mb-2" style={{ color: scheme.textTertiary }} />
              <p className="text-sm" style={{ color: scheme.textSecondary }}>暂无衣柜数据</p>
              <p className="text-xs mt-1" style={{ color: scheme.textTertiary }}>提取元数据后自动识别服装</p>
            </div>
          )}
        </div>
      </div>

      {/* ========== 快速操作 ========== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          {
            title: '扫描相册',
            desc: '自动检测游戏目录，导入所有图片',
            icon: FolderOpen,
            gradient: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
            action: () => navigate('/settings'),
            btnText: '开始扫描',
          },
          {
            title: 'AI智能识别',
            desc: '自动识别图片内容，生成智能标签',
            icon: Sparkles,
            gradient: `linear-gradient(135deg, ${scheme.info}, #6366f1)`,
            action: () => navigate('/ai-process'),
            btnText: '开始识别',
          },
          {
            title: '导入分享码',
            desc: '批量导入或手动添加分享码',
            icon: Share2,
            gradient: `linear-gradient(135deg, ${scheme.success}, #34d399)`,
            action: () => navigate('/share-codes'),
            btnText: '导入分享码',
          },
        ].map((action, index) => (
          <div
            key={action.title}
            className="rounded-2xl p-5 text-white relative overflow-hidden stagger-item group"
            style={{
              background: action.gradient,
              animationDelay: `${(index + 10) * 80}ms`,
            }}
          >
            {/* 装饰元素 */}
            <div className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-10"
              style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
            <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full opacity-5"
              style={{ background: 'white', transform: 'translate(-30%, 30%)' }} />

            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-2">
                <action.icon className="w-5 h-5" />
                <h3 className="text-base font-semibold">{action.title}</h3>
              </div>
              <p className="text-white/75 mb-4 text-sm">{action.desc}</p>
              <button
                onClick={action.action}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
              >
                {action.btnText} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
