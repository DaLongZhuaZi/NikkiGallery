import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'
import Header from '../Header'
import Sidebar from '../Sidebar'
import TaskPanel from '@/components/tasks/TaskPanel'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { scheme, isDark } = useTheme()

  return (
    <div 
      className="flex h-screen overflow-hidden"
      style={{ 
        background: isDark 
          ? scheme.bgMain 
          : `linear-gradient(135deg, ${scheme.bgMain} 0%, ${scheme.bgCard} 50%, ${scheme.primaryLight} 100%)` 
      }}
    >
      {/* 侧边栏 */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main
          className="flex-1 overflow-y-auto p-4 lg:p-6"
          style={{ color: scheme.textPrimary }}
        >
          <Outlet />
        </main>
      </div>

      {/* 后台任务面板 */}
      <TaskPanel />
    </div>
  )
}
