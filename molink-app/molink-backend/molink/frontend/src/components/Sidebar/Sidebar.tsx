import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  FileText, 
  Search,
  Settings,
  LogOut,
  Home,
  Inbox,
  MoreHorizontal,
  Clock,
  ArrowDownUp,
  Check,
  Trash2
} from 'lucide-react'
import { pagesApi } from '../../api/pages'
import { workspacesApi } from '../../api/workspaces'
import { Workspace, Page } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import SearchModal from '../Search/SearchModal'
import SettingsModal from '../Settings/SettingsModal'

interface SidebarProps {
  workspace: Workspace
  isFloating: boolean
}

type SortType = 'manual' | 'last_edited'

export default function Sidebar({ workspace, isFloating }: SidebarProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Data State
  const [pages, setPages] = useState<Page[]>([])
  
  // UI State
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set())
  const [privateExpanded, setPrivateExpanded] = useState(true)
  const [sharedExpanded, setSharedExpanded] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [sortType, setSortType] = useState<SortType>('manual')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [sharedSortType, setSharedSortType] = useState<SortType>('manual')
  const [showSharedSortMenu, setShowSharedSortMenu] = useState(false)
  const [pageMenuOpen, setPageMenuOpen] = useState<string | null>(null)
  
  // Modals
  const [showSearch, setShowSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const userMenuRef = useRef<HTMLDivElement>(null)
  const sortMenuRef = useRef<HTMLDivElement>(null)
  const sharedSortMenuRef = useRef<HTMLDivElement>(null)
  const pageMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (workspace) {
      loadPages()
      
      // Load sort preference from settings
      try {
        if (workspace.settings) {
          const settings = typeof workspace.settings === 'string' 
            ? JSON.parse(workspace.settings) 
            : workspace.settings
          if (settings.sidebar_sort_private) {
            setSortType(settings.sidebar_sort_private)
          }
          if (settings.sidebar_sort_shared) {
            setSharedSortType(settings.sidebar_sort_shared)
          }
        }
      } catch (e) {
        console.error('Error parsing workspace settings', e)
      }
    }
  }, [workspace])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false)
      }
      if (sharedSortMenuRef.current && !sharedSortMenuRef.current.contains(event.target as Node)) {
        setShowSharedSortMenu(false)
      }
      if (pageMenuRef.current && !pageMenuRef.current.contains(event.target as Node)) {
        setPageMenuOpen(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [userMenuRef, sortMenuRef, sharedSortMenuRef, pageMenuRef])

  const loadPages = async () => {
    try {
      const data = await pagesApi.list(workspace.id)
      setPages(data)
    } catch (err) {
      console.error('Error loading pages:', err)
    }
  }

  const handleSortChange = async (type: SortType, isShared = false) => {
    if (isShared) {
      setSharedSortType(type)
      setShowSharedSortMenu(false)
    } else {
      setSortType(type)
      setShowSortMenu(false)
    }
    
    // Save to backend
    try {
      const currentSettings = workspace.settings 
        ? (typeof workspace.settings === 'string' ? JSON.parse(workspace.settings) : workspace.settings) 
        : {}
      
      const newSettings = {
        ...currentSettings,
        [isShared ? 'sidebar_sort_shared' : 'sidebar_sort_private']: type
      }
      
      await workspacesApi.update(workspace.id, {
        settings: newSettings
      })
    } catch (err) {
      console.error('Error saving sort preference:', err)
    }
  }

  const getSortedPages = (pages: Page[], useSharedSort = false) => {
    const sorted = [...pages]
    const currentSortType = useSharedSort ? sharedSortType : sortType
    if (currentSortType === 'manual') {
      sorted.sort((a, b) => a.position - b.position)
    } else {
      sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    }
    return sorted
  }

  const createPage = async (parentId?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!user || !workspace?.id) return

    try {
      const data = await pagesApi.create({
        workspace_id: workspace.id,
        parent_id: parentId,
        title: '无标题'
      })
      setPages([...pages, data])
      navigate(`/workspace/page/${data.id}`)
      if (parentId) {
        setExpandedPages(prev => new Set(prev).add(parentId))
      }
    } catch (err: any) {
      console.error('Error creating page:', err)
      alert(err.response?.data?.detail || '创建页面失败')
    }
  }

  const togglePageExpand = (pageId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const newExpanded = new Set(expandedPages)
    if (newExpanded.has(pageId)) {
      newExpanded.delete(pageId)
    } else {
      newExpanded.add(pageId)
    }
    setExpandedPages(newExpanded)
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const deletePage = async (pageId: string) => {
    try {
      await pagesApi.delete(pageId)
      setPages(pages.filter(p => p.id !== pageId))
      setPageMenuOpen(null)
      // 如果当前在这个页面，导航到主页
      if (location.pathname === `/workspace/page/${pageId}`) {
        navigate('/workspace')
      }
    } catch (err: any) {
      console.error('Error deleting page:', err)
    }
  }

  const renderPage = (page: Page, level = 0) => {
    const hasChildren = pages.some(p => p.parent_id === page.id)
    const isExpanded = expandedPages.has(page.id)
    const isActive = location.pathname === `/workspace/page/${page.id}`

    return (
      <div key={page.id}>
        <div
          onClick={() => navigate(`/workspace/page/${page.id}`)}
          className={`group flex items-center gap-1 px-3 py-1 text-sm cursor-pointer select-none transition-colors min-h-[28px] ${
            isActive 
              ? 'bg-gray-100 dark:bg-gray-800 text-text-main font-medium' 
              : 'text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-text-main'
          }`}
          style={{ paddingLeft: `${12 + level * 12}px` }}
        >
          {/* 固定位置容器：包含展开按钮和图标，根据hover状态切换显示 */}
          <div className="w-4 h-4 flex-shrink-0 relative flex items-center justify-center">
            {/* 图标：默认显示，已展开且有子页面时隐藏，hover时隐藏（如果有子页面） */}
            <FileText 
              className={`w-4 h-4 ${
                hasChildren && isExpanded 
                  ? 'hidden' 
                  : hasChildren 
                    ? 'group-hover:hidden' 
                    : ''
              } ${isActive ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'}`} 
            />
            {/* 展开按钮：如果有子页面，在hover时或已展开时显示 */}
            {hasChildren && (
              <div 
                className={`absolute inset-0 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${isExpanded ? 'flex' : 'hidden group-hover:flex'}`}
                onClick={(e) => {
                  e.stopPropagation()
                  togglePageExpand(page.id, e)
                }}
              >
                {isExpanded ? (
                   <ChevronDown className="w-3 h-3 text-gray-400" />
                ) : (
                   <ChevronRight className="w-3 h-3 text-gray-400" />
                )}
              </div>
            )}
          </div>
          
          <span className="flex-1 truncate ml-1">{page.title || '无标题'}</span>

          <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity relative`}>
            <button
              onClick={(e) => { 
                e.stopPropagation()
                setPageMenuOpen(pageMenuOpen === page.id ? null : page.id)
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-text-main"
              title="更多"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => createPage(page.id, e)}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-text-main"
              title="新建子页面"
            >
              <Plus className="w-3 h-3" />
            </button>

            {/* 页面菜单 */}
            {pageMenuOpen === page.id && (
              <div 
                ref={pageMenuRef}
                className="absolute right-0 top-6 w-48 bg-white dark:bg-[#1e1e1e] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deletePage(page.id)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-main hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 group/delete transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-text-muted group-hover/delete:text-red-600" />
                  <span>删除</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {getSortedPages(pages.filter(p => p.parent_id === page.id), false)
              .map(childPage => renderPage(childPage, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <aside 
        className={`
          flex flex-col bg-[#F7F7F5] dark:bg-[#202020] overflow-hidden h-full
          border-r border-gray-200 dark:border-gray-800 
          ${isFloating ? 'shadow-2xl rounded-r-xl' : ''}
        `}
      >
        {/* Row 2: Workspace Switcher */}
        <div className="px-3 mb-2">
           <div 
             className="flex items-center gap-2 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md cursor-pointer transition-colors"
             onClick={() => setShowUserMenu(!showUserMenu)}
             ref={userMenuRef}
           >
              <div className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded flex items-center justify-center text-[10px] text-white font-bold">
                 {user?.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-medium truncate flex-1 text-text-main">
                 {user?.full_name ? `${user.full_name}的Molink` : '我的Molink'}
              </span>
              <ChevronDown className="w-3 h-3 text-text-muted" />
           </div>

           {showUserMenu && (
            <div className="absolute left-4 top-24 w-56 bg-white dark:bg-[#1e1e1e] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <p className="text-sm font-medium text-text-main">{user?.full_name || user?.email}</p>
                <p className="text-xs text-text-muted">{user?.email}</p>
              </div>
              <div className="py-1">
                <button 
                  onClick={() => setShowSettings(true)}
                  className="w-full text-left px-3 py-2 text-sm text-text-main hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4 text-text-muted" />
                  设置
                </button>
                <button 
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  退出登录
                </button>
              </div>
            </div>
           )}
        </div>

        {/* Quick Actions (Search, Home, Inbox) */}
        <div className="flex flex-col px-2 mb-4 space-y-0.5">
          <button 
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 px-3 py-1 text-sm text-text-muted hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>搜索</span>
          </button>
          <button 
            onClick={() => navigate('/workspace')}
            className="flex items-center gap-2 px-3 py-1 text-sm text-text-muted hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>主页</span>
          </button>
          <button 
            className="flex items-center gap-2 px-3 py-1 text-sm text-text-muted hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <Inbox className="w-4 h-4" />
            <span>收件箱</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          
          {/* Shared Section */}
          <div className="mb-4 relative">
            <div 
              className="group flex items-center justify-between px-3 py-1 text-xs font-semibold text-text-muted/70 hover:text-text-muted mb-1 cursor-pointer"
              onClick={() => setSharedExpanded(!sharedExpanded)}
            >
              <span>共享</span>
              <div className="flex items-center opacity-0 group-hover:opacity-100 gap-0.5">
                 <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowSharedSortMenu(!showSharedSortMenu)
                  }}
                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-text-main"
                  title="排序与更多"
                 >
                   <MoreHorizontal className="w-3 h-3" />
                 </button>
              </div>
            </div>

            {/* Shared Sort Menu */}
            {showSharedSortMenu && (
              <div 
                ref={sharedSortMenuRef}
                className="absolute left-10 top-8 w-48 bg-white dark:bg-[#1e1e1e] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50"
              >
                <div className="px-3 py-2 text-xs font-semibold text-text-muted border-b border-gray-100 dark:border-gray-700">
                  排序方式
                </div>
                <button
                  onClick={() => handleSortChange('manual', true)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-main hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <ArrowDownUp className="w-4 h-4 text-text-muted" />
                    <span>手动排序</span>
                  </div>
                  {sharedSortType === 'manual' && <Check className="w-4 h-4 text-theme-accent" />}
                </button>
                <button
                  onClick={() => handleSortChange('last_edited', true)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-main hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-text-muted" />
                    <span>最近编辑</span>
                  </div>
                  {sharedSortType === 'last_edited' && <Check className="w-4 h-4 text-theme-accent" />}
                </button>
              </div>
            )}

            {sharedExpanded && (
              <div className="space-y-0.5">
                {(() => {
                  // Filter shared pages (pages not created by current user, or pages with page_type !== 'database')
                  const sharedPages = pages.filter(p => 
                    !p.parent_id && 
                    p.page_type !== 'database' && 
                    p.created_by !== user?.id
                  )
                  
                  if (sharedPages.length === 0) {
                    return (
                      <div
                        onClick={(e) => createPage(undefined, e)}
                        className="flex items-center gap-2 px-3 py-1 text-sm text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-text-main cursor-pointer rounded-md transition-colors min-h-[28px]"
                      >
                        <Plus className="w-4 h-4 flex-shrink-0" />
                        <span>开始协作</span>
                      </div>
                    )
                  }
                  
                  return getSortedPages(sharedPages, true).map(page => renderPage(page))
                })()}
              </div>
            )}
          </div>

          {/* Private Section (Pages + Databases) */}
          <div className="relative">
            <div 
              className="group flex items-center justify-between px-3 py-1 text-xs font-semibold text-text-muted/70 hover:text-text-muted mb-1 cursor-pointer"
              onClick={() => setPrivateExpanded(!privateExpanded)}
            >
              <span>私人</span>
              <div className="flex items-center opacity-0 group-hover:opacity-100 gap-0.5">
                 <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowSortMenu(!showSortMenu)
                  }}
                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-text-main"
                  title="排序与更多"
                 >
                   <MoreHorizontal className="w-3 h-3" />
                 </button>
                 <button
                  onClick={(e) => createPage(undefined, e)} 
                  title="新建页面"
                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-text-main"
                 >
                   <Plus className="w-3 h-3" />
                 </button>
              </div>
            </div>

            {/* Sort Menu */}
            {showSortMenu && (
              <div 
                ref={sortMenuRef}
                className="absolute left-10 top-8 w-48 bg-white dark:bg-[#1e1e1e] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50"
              >
                <div className="px-3 py-2 text-xs font-semibold text-text-muted border-b border-gray-100 dark:border-gray-700">
                  排序方式
                </div>
                <button
                  onClick={() => handleSortChange('manual')}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-main hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <ArrowDownUp className="w-4 h-4 text-text-muted" />
                    <span>手动排序</span>
                  </div>
                  {sortType === 'manual' && <Check className="w-4 h-4 text-theme-accent" />}
                </button>
                <button
                  onClick={() => handleSortChange('last_edited')}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-main hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-text-muted" />
                    <span>最近编辑</span>
                  </div>
                  {sortType === 'last_edited' && <Check className="w-4 h-4 text-theme-accent" />}
                </button>
              </div>
            )}

            {privateExpanded && (
              <div className="space-y-0.5">
                {/* Filter out database pages and only show pages created by current user */}
                {(() => {
                  const privatePages = pages.filter(p => 
                    !p.parent_id && 
                    p.page_type !== 'database' && 
                    p.created_by === user?.id
                  )
                  
                  if (privatePages.length === 0) {
                    return (
                      <div className="px-3 text-xs text-text-muted italic">无页面</div>
                    )
                  }
                  
                  return getSortedPages(privatePages, false).map(page => renderPage(page))
                })()}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Modals */}
      {showSearch && <SearchModal workspace={workspace} onClose={() => setShowSearch(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  )
}
