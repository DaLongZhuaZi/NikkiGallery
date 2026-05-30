import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Image, Share2, Cpu, HardDrive, TrendingUp, Sparkles, ArrowRight, Zap, Clock } from 'lucide-react'
import { useAlbumStore } from '@/stores/useAlbumStore'
import { useImageStore } from '@/stores/useImageStore'
import { useShareStore } from '@/stores/useShareStore'
import { useTheme } from '@/contexts/ThemeContext'

export default function HomePage() {
  const navigate = useNavigate()
  const { scheme } = useTheme()
  const { albums, fetchAlbums } = useAlbumStore()
  const { images, fetchImages, imageStats, fetchImageStats } = useImageStore()
  const { shareCodes, fetchShareCodes } = useShareStore()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchAlbums()
    fetchImages()
    fetchImageStats()
    fetchShareCodes()
    // 延迟加载动画
    const timer = setTimeout(() => setLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [fetchAlbums, fetchImages, fetchImageStats, fetchShareCodes])

  const stats = [
    {
      name: '相册数量',
      value: albums.length,
      icon: Image,
      gradient: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
      bgColor: scheme.bgHover,
    },
    {
      name: '图片总数',
      value: imageStats.total || images.length,
      icon: Image,
      gradient: `linear-gradient(135deg, ${scheme.info}, ${scheme.primary})`,
      bgColor: scheme.bgHover,
    },
    {
      name: '分享码',
      value: shareCodes.length,
      icon: Share2,
      gradient: `linear-gradient(135deg, ${scheme.success}, #34d399)`,
      bgColor: scheme.bgHover,
    },
    {
      name: 'AI处理',
      value: imageStats.aiProcessed || images.filter(i => i.aiProcessed).length,
      icon: Cpu,
      gradient: `linear-gradient(135deg, ${scheme.warning}, #fbbf24)`,
      bgColor: scheme.bgHover,
    },
  ]

  const recentImages = images.slice(0, 8)

  const quickActions = [
    {
      title: '快速扫描',
      desc: '自动检测游戏相册目录，导入所有图片',
      gradient: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
      action: () => navigate('/settings'),
      btnText: '开始扫描',
    },
    {
      title: 'AI智能识别',
      desc: '使用AI自动识别图片内容，生成智能标签',
      gradient: `linear-gradient(135deg, ${scheme.info}, #6366f1)`,
      action: () => navigate('/ai-process'),
      btnText: '开始识别',
    },
  ]

  return (
    <div className="page-transition max-w-6xl mx-auto">
      {/* 欢迎区域 */}
      <div 
        className="mb-8 p-6 rounded-2xl"
        style={{ 
          background: `linear-gradient(135deg, ${scheme.primary}15, ${scheme.gradientEnd}10)`,
          border: `1px solid ${scheme.borderLight}`,
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl animate-float">🎀</span>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: scheme.textPrimary }}>
              欢迎使用 <span style={{ 
                background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>NikkiGallery</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: scheme.textSecondary }}>
              无限暖暖智能相册管理系统，让您的游戏截图管理更轻松 ✨
            </p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <div
            key={stat.name}
            className="theme-card p-5 cursor-pointer stagger-item"
            style={{ 
              animationDelay: `${index * 100}ms`,
              opacity: loaded ? 1 : 0,
            }}
            onClick={() => {
              if (stat.name === '相册数量') navigate('/gallery')
              if (stat.name === '分享码') navigate('/share-codes')
              if (stat.name === 'AI处理') navigate('/ai-process')
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div 
                className="p-2.5 rounded-xl"
                style={{ background: stat.bgColor }}
              >
                <stat.icon className="w-5 h-5" style={{ color: scheme.primary }} />
              </div>
              <TrendingUp className="w-4 h-4" style={{ color: scheme.success }} />
            </div>
            <p className="text-xs font-medium mb-1" style={{ color: scheme.textSecondary }}>
              {stat.name}
            </p>
            <p className="text-2xl font-bold" style={{ color: scheme.textPrimary }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* 最近图片 */}
      <div className="theme-card p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: scheme.primary }} />
            <h2 className="text-base font-semibold" style={{ color: scheme.textPrimary }}>
              最近图片
            </h2>
          </div>
          <button
            onClick={() => navigate('/gallery')}
            className="flex items-center gap-1 text-sm font-medium transition-colors"
            style={{ color: scheme.primary }}
          >
            查看全部 <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {recentImages.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {recentImages.map((image, index) => (
              <div
                key={image.id}
                className="aspect-square rounded-xl overflow-hidden cursor-pointer stagger-item"
                style={{ 
                  animationDelay: `${(index + 4) * 80}ms`,
                  background: scheme.bgHover,
                  border: `1px solid ${scheme.borderLight}`,
                }}
                onClick={() => navigate(`/gallery/${image.albumId}`)}
              >
                <img
                  src={`/api/images/${image.id}/thumbnail?size=small`}
                  alt={image.filename}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state py-12">
            <Image className="w-12 h-12 mb-3" style={{ color: scheme.textTertiary }} />
            <p className="font-medium" style={{ color: scheme.textSecondary }}>暂无图片</p>
            <p className="text-sm mt-1" style={{ color: scheme.textTertiary }}>
              扫描游戏相册以获取图片
            </p>
          </div>
        )}
      </div>

      {/* 快速操作 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickActions.map((action, index) => (
          <div 
            key={action.title}
            className="rounded-2xl p-6 text-white relative overflow-hidden stagger-item"
            style={{ 
              background: action.gradient,
              animationDelay: `${(index + 8) * 100}ms`,
            }}
          >
            {/* 装饰元素 */}
            <div 
              className="absolute top-0 right-0 w-32 h-32 rounded-full"
              style={{ 
                background: 'rgba(255,255,255,0.1)',
                transform: 'translate(30%, -30%)',
              }}
            />
            <div 
              className="absolute bottom-0 left-0 w-24 h-24 rounded-full"
              style={{ 
                background: 'rgba(255,255,255,0.05)',
                transform: 'translate(-30%, 30%)',
              }}
            />
            
            <div className="relative z-10">
              <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
              <p className="text-white/80 mb-4 text-sm">{action.desc}</p>
              <button
                onClick={action.action}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
              >
                {action.btnText} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
