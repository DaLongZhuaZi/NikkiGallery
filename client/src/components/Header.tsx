import { Search, Bell, RefreshCw, Menu } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useUIStore } from '@/stores/useUIStore'

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const { toggleMobileMenu } = useUIStore()

  const handleScan = async () => {
    setIsScanning(true)
    try {
      // TODO: 调用扫描API
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.success('扫描完成，发现新图片')
    } catch (error) {
      toast.error('扫描失败')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <header className="h-14 md:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0 relative z-10">
      {/* 移动端菜单按钮 & 搜索框 */}
      <div className="flex items-center flex-1 max-w-md gap-3">
        <button 
          onClick={toggleMobileMenu}
          className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 md:pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* 右侧操作 */}
      <div className="flex items-center gap-3">
        {/* 扫描按钮 */}
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isScanning ? '扫描中...' : '扫描相册'}</span>
        </button>

        {/* 通知按钮 */}
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full" />
        </button>
      </div>
    </header>
  )
}
