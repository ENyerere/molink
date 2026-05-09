import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { workspacesApi } from '../api/workspaces'
import { Workspace } from '../types'
import Sidebar from '../components/Sidebar/Sidebar'
import PageEditor from '../components/Page/PageEditor'
import DatabaseView from '../components/Database/DatabaseView'
import TopBar from '../components/TopBar'

export default function WorkspacePage() {
  const { user } = useAuth()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isSidebarHovered, setIsSidebarHovered] = useState(false)

  useEffect(() => {
    loadWorkspace()
  }, [user])

  const loadWorkspace = async () => {
    if (!user) return

    try {
      // 获取用户的工作空间
      const workspaces = await workspacesApi.list()

      if (workspaces.length > 0) {
        setWorkspace(workspaces[0])
      } else {
        // 创建默认工作空间
        const newWorkspace = await workspacesApi.create({
          name: '我的工作空间'
        })
        setWorkspace(newWorkspace)
      }
    } catch (err) {
      console.error('Error loading workspace:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-theme-base">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-accent mx-auto"></div>
          <p className="mt-4 text-text-muted">加载工作空间...</p>
        </div>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-screen bg-theme-base">
        <div className="text-center">
          <p className="text-text-muted">无法加载工作空间</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-theme-base overflow-hidden">
      <TopBar 
        workspace={workspace} 
        isSidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
      />

      <div className="relative flex flex-1 overflow-hidden">
        {/* Sidebar Hover Trigger (when closed) */}
        {!sidebarOpen && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-6 z-40 bg-transparent"
            onMouseEnter={() => setIsSidebarHovered(true)}
          />
        )}

        {/* 普通侧边栏 - 始终渲染，通过transform控制显示 */}
        <div 
          className={`flex-shrink-0 transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'w-60' : 'w-0'
          }`}
        >
          <div className={`w-60 h-full transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <Sidebar 
              workspace={workspace}
              isFloating={false}
            />
          </div>
        </div>

        {/* 悬浮侧边栏 - 关闭时且鼠标悬停显示 */}
        <div 
          className={`fixed left-0 z-50 w-60 transition-transform duration-200 ease-in-out ${
            !sidebarOpen && isSidebarHovered ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ 
            top: 108, // 48 + 60
            bottom: 60,
            maxHeight: 720
          }}
          onMouseLeave={() => setIsSidebarHovered(false)}
        >
          <Sidebar 
            workspace={workspace}
            isFloating={true}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden w-full">
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-text-muted">
                    <p className="text-lg">选择或创建一个页面开始编辑</p>
                  </div>
                </div>
              } />
              <Route path="/page/:pageId" element={<PageEditor workspace={workspace} />} />
              <Route path="/database/:databaseId" element={<DatabaseView workspace={workspace} />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  )
}
