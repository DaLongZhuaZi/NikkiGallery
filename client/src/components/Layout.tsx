import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useUIStore } from '@/stores/useUIStore'

export default function Layout() {
  const { isMobileMenuOpen, setMobileMenuOpen } = useUIStore()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* 侧边栏 */}
      <Sidebar />
      
      {/* 移动端侧边栏遮罩 */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-0">
        {/* 头部导航 */}
        <Header />
        
        {/* 页面内容 */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 w-full">
          <div className="max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
