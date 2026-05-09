import { Menu, MoreHorizontal, Star, Clock, ChevronsLeft } from 'lucide-react'
import { Workspace } from '../types'

interface TopBarProps {
  workspace: Workspace
  isSidebarOpen: boolean
  onToggleSidebar: () => void
}

export default function TopBar({ workspace, isSidebarOpen, onToggleSidebar }: TopBarProps) {
  return (
    <header className="h-12 bg-[#F7F7F5] dark:bg-[#202020] flex items-center justify-between px-2 sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-xl">🦊</span>
          <button
            onClick={onToggleSidebar}
            className="p-1 rounded text-text-muted hover:bg-transparent focus:outline-none"
            title={isSidebarOpen ? '收起侧边栏' : '展开侧边栏'}
          >
            {isSidebarOpen ? <ChevronsLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="text-sm font-medium truncate max-w-[200px] ml-1">{workspace.name}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
          <button
          className="p-1 hover:bg-gray-100 rounded transition dark:hover:bg-gray-800 text-text-muted"
          title="分享"
          >
          <span className="text-sm px-1">Share</span>
          </button>
        
        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

          <button
          className="p-1 hover:bg-gray-100 rounded transition dark:hover:bg-gray-800 text-text-muted"
          title="更新"
          >
          <Clock className="w-4 h-4" />
          </button>

            <button
          className="p-1 hover:bg-gray-100 rounded transition dark:hover:bg-gray-800 text-text-muted"
          title="收藏"
        >
          <Star className="w-4 h-4" />
            </button>

                <button
          className="p-1 hover:bg-gray-100 rounded transition dark:hover:bg-gray-800 text-text-muted"
          title="更多"
                >
          <MoreHorizontal className="w-4 h-4" />
                </button>
        </div>
      </header>
  )
}
