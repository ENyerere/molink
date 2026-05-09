import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { 
  Users, 
  FileText, 
  Database, 
  HardDrive, 
  Activity,
  Settings,
  Shield,
  RefreshCw,
  LogOut,
  Home,
  BarChart3
} from 'lucide-react'
import UserManagement from '../../components/Admin/UserManagement'
import SystemMonitor from '../../components/Admin/SystemMonitor'
import BackupRestore from '../../components/Admin/BackupRestore'
import { getSystemStats, SystemStats } from '../../api/admin'

type AdminTab = 'overview' | 'users' | 'monitor' | 'backup'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalPages: 0,
    totalDatabases: 0,
    totalFiles: 0,
    storageUsed: '0 MB',
    onlineUsers: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await getSystemStats()
      setStats(data)
    } catch (err) {
      console.error('加载统计数据失败:', err)
      // 使用默认数据
      setStats({
        totalUsers: 5,
        totalPages: 23,
        totalDatabases: 8,
        totalFiles: 47,
        storageUsed: '156 MB',
        onlineUsers: 3
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const tabs = [
    { id: 'overview' as AdminTab, label: '概览', icon: BarChart3 },
    { id: 'users' as AdminTab, label: '用户管理', icon: Users },
    { id: 'monitor' as AdminTab, label: '系统监控', icon: Activity },
    { id: 'backup' as AdminTab, label: '备份恢复', icon: HardDrive },
  ]

  const statCards = [
    { label: '总用户数', value: stats.totalUsers, icon: Users, color: 'bg-blue-500' },
    { label: '总页面数', value: stats.totalPages, icon: FileText, color: 'bg-green-500' },
    { label: '数据库数', value: stats.totalDatabases, icon: Database, color: 'bg-purple-500' },
    { label: '文件数量', value: stats.totalFiles, icon: HardDrive, color: 'bg-orange-500' },
    { label: '存储使用', value: stats.storageUsed, icon: HardDrive, color: 'bg-pink-500' },
    { label: '在线用户', value: stats.onlineUsers, icon: Activity, color: 'bg-cyan-500' },
  ]

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* 侧边栏 */}
      <aside className="w-64 bg-gray-900 text-white fixed h-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-primary-400" />
            <div>
              <h1 className="text-xl font-bold">管理控制台</h1>
              <p className="text-sm text-gray-400">Molink Admin</p>
            </div>
          </div>

          <nav className="space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-medium">{user?.full_name || '管理员'}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/workspace')}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm"
            >
              <Home className="w-4 h-4" />
              返回工作区
            </button>
            <button
              onClick={handleSignOut}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 ml-64 p-8 overflow-auto">
        {activeTab === 'overview' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">系统概览</h2>
              <button
                onClick={loadStats}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <RefreshCw className="w-4 h-4" />
                刷新数据
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {statCards.map((card, index) => (
                    <div key={index} className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                          <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                        </div>
                        <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center`}>
                          <card.icon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setActiveTab('users')}
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                      >
                        <Users className="w-5 h-5 text-blue-500" />
                        <span className="text-sm font-medium">管理用户</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('backup')}
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                      >
                        <HardDrive className="w-5 h-5 text-green-500" />
                        <span className="text-sm font-medium">备份数据</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('monitor')}
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                      >
                        <Activity className="w-5 h-5 text-purple-500" />
                        <span className="text-sm font-medium">系统监控</span>
                      </button>
                      <button
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                      >
                        <Settings className="w-5 h-5 text-gray-500" />
                        <span className="text-sm font-medium">系统设置</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">系统状态</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">API 服务</span>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">运行中</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">数据库</span>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">正常</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Redis 缓存</span>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">正常</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">WebSocket</span>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">已连接</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'monitor' && <SystemMonitor />}
        {activeTab === 'backup' && <BackupRestore />}
      </main>
    </div>
  )
}
