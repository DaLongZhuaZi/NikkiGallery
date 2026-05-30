import { NavLink } from 'react-router-dom'
import {
  Home,
  Image,
  Share2,
  Cpu,
  Settings,
  Heart,
  Map,
  Wifi,
  User,
  Copy,
  FolderOpen,
  FileVideo,
  Puzzle,
  Archive,
  Activity,
} from 'lucide-react'
import clsx from 'clsx'
import { useTaskStore } from '@/stores/useTaskStore'
import { useUIStore } from '@/stores/useUIStore'

const navigation = [
  { name: '首页', href: '/', icon: Home },
  { name: '相册', href: '/gallery', icon: Image },
  { name: '地图', href: '/map', icon: Map },
  { name: '账号管理', href: '/accounts', icon: User },
  { name: '智能去重', href: '/dedup', icon: Copy },
  { name: '游戏资源', href: '/resources', icon: FolderOpen },
  { name: 'MP4转GIF', href: '/gif-converter', icon: FileVideo },
  { name: '插件管理', href: '/plugins', icon: Puzzle },
  { name: '归档管理', href: '/archives', icon: Archive },
  { name: '局域网传输', href: '/transfer', icon: Wifi },
  { name: '分享码', href: '/share-codes', icon: Share2 },
  { name: 'AI处理', href: '/ai-process', icon: Cpu },
  { name: '设置', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const { stats, togglePanel, showPanel } = useTaskStore()
  const { isMobileMenuOpen, setMobileMenuOpen } = useUIStore()

  return (
    <div className={clsx(
      "w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-transform duration-300 z-40 h-full",
      "fixed md:relative left-0 top-0", // 移动端 fixed，PC 端 relative
      isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0" // 移动端显隐控制
    )}>
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text">NikkiGallery</h1>
            <p className="text-xs text-gray-500">智能相册管理</p>
          </div>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-pink-50 to-purple-50 text-pink-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}

        {/* 任务面板按钮 */}
        <button
          onClick={togglePanel}
          className={clsx(
            'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 w-full',
            showPanel
              ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          )}
        >
          <Activity className="w-5 h-5" />
          <span>后台任务</span>
          {(stats.running > 0 || stats.pending > 0) && (
            <span className="ml-auto text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
              {stats.running + stats.pending}
            </span>
          )}
        </button>
      </nav>

      {/* 底部信息 */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-4">
          <p className="text-xs text-gray-600 mb-1">AI引擎状态</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-700">就绪</span>
          </div>
        </div>
      </div>
    </div>
  )
}
