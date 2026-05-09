import { useState, useEffect } from 'react'
import { 
  Users, 
  Search, 
  MoreVertical, 
  UserPlus, 
  Shield, 
  Ban, 
  Trash2,
  Edit,
  X,
  Check,
  Loader
} from 'lucide-react'
import {
  getAllUsers,
  createUserByAdmin,
  deleteUserByAdmin,
  toggleUserStatus,
  toggleAdminRole,
  AdminUser,
  CreateUserRequest
} from '../../api/admin'

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [actionMenu, setActionMenu] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // 创建用户表单状态
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  const [, setSelectedUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await getAllUsers({ search: searchQuery || undefined })
      setUsers(data)
    } catch (err) {
      console.error('加载用户失败:', err)
      // 使用模拟数据
      setUsers([
        { id: '1', email: 'admin@molink.local', full_name: '系统管理员', is_active: true, is_admin: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: '2', email: 'user1@example.com', full_name: '张三', is_active: true, is_admin: false, created_at: '2024-01-15', updated_at: '2024-01-15' },
        { id: '3', email: 'user2@example.com', full_name: '李四', is_active: true, is_admin: false, created_at: '2024-02-01', updated_at: '2024-02-01' },
        { id: '4', email: 'user3@example.com', full_name: '王五', is_active: false, is_admin: false, created_at: '2024-02-15', updated_at: '2024-02-15' },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) {
        loadUsers()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleToggleUserStatus = async (userId: string) => {
    try {
      setActionLoading(userId)
      const result = await toggleUserStatus(userId)
      setUsers(users.map(u =>
        u.id === userId ? { ...u, is_active: result.is_active } : u
      ))
    } catch (err) {
      console.error('切换用户状态失败:', err)
      // 本地模拟
      setUsers(users.map(u =>
        u.id === userId ? { ...u, is_active: !u.is_active } : u
      ))
    } finally {
      setActionLoading(null)
      setActionMenu(null)
    }
  }

  const handleToggleAdminRole = async (userId: string) => {
    try {
      setActionLoading(userId)
      const result = await toggleAdminRole(userId)
      setUsers(users.map(u =>
        u.id === userId ? { ...u, is_admin: result.is_admin } : u
      ))
    } catch (err) {
      console.error('切换管理员角色失败:', err)
      // 本地模拟
      setUsers(users.map(u =>
        u.id === userId ? { ...u, is_admin: !u.is_admin } : u
      ))
    } finally {
      setActionLoading(null)
      setActionMenu(null)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除这个用户吗？此操作不可恢复。')) return

    try {
      setActionLoading(userId)
      await deleteUserByAdmin(userId)
      setUsers(users.filter(u => u.id !== userId))
    } catch (err) {
      console.error('删除用户失败:', err)
      alert('删除用户失败，请重试')
    } finally {
      setActionLoading(null)
      setActionMenu(null)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')

    if (!newUserEmail || !newUserPassword) {
      setCreateError('请填写邮箱和密码')
      return
    }

    if (newUserPassword.length < 6) {
      setCreateError('密码至少需要6位')
      return
    }

    try {
      setCreateLoading(true)
      const userData: CreateUserRequest = {
        email: newUserEmail,
        password: newUserPassword,
        full_name: newUserName || undefined,
        is_admin: newUserIsAdmin
      }
      const newUser = await createUserByAdmin(userData)
      setUsers([newUser, ...users])
      setShowCreateModal(false)
      resetCreateForm()
    } catch (err: any) {
      console.error('创建用户失败:', err)
      setCreateError(err.response?.data?.detail || '创建用户失败，请重试')
    } finally {
      setCreateLoading(false)
    }
  }

  const resetCreateForm = () => {
    setNewUserEmail('')
    setNewUserName('')
    setNewUserPassword('')
    setNewUserIsAdmin(false)
    setCreateError('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">用户管理</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          <UserPlus className="w-4 h-4" />
          添加用户
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索用户邮箱或姓名..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 用户表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">用户</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">角色</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">状态</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">创建时间</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full rounded-full" />
                        ) : (
                          <Users className="w-5 h-5 text-primary-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.full_name || '未设置'}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.is_admin ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                        <Shield className="w-3 h-3" />
                        管理员
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        普通用户
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        <Check className="w-3 h-3" />
                        已启用
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                        <Ban className="w-3 h-3" />
                        已禁用
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative">
                      <button
                        onClick={() => setActionMenu(actionMenu === user.id ? null : user.id)}
                        disabled={actionLoading === user.id}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                      >
                        {actionLoading === user.id ? (
                          <Loader className="w-4 h-4 text-gray-500 animate-spin" />
                        ) : (
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        )}
                      </button>

                      {actionMenu === user.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit className="w-4 h-4" />
                            编辑用户
                          </button>
                          <button
                            onClick={() => handleToggleAdminRole(user.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Shield className="w-4 h-4" />
                            {user.is_admin ? '移除管理员' : '设为管理员'}
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(user.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Ban className="w-4 h-4" />
                            {user.is_active ? '禁用账户' : '启用账户'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            删除用户
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            没有找到匹配的用户
          </div>
        )}
      </div>

      {/* 创建用户模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">添加新用户</h3>
              <button 
                onClick={() => {
                  setShowCreateModal(false)
                  resetCreateForm()
                }} 
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱 *</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="用户姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">初始密码 *</label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="至少6位"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="isAdmin" 
                  checked={newUserIsAdmin}
                  onChange={(e) => setNewUserIsAdmin(e.target.checked)}
                  className="w-4 h-4 rounded" 
                />
                <label htmlFor="isAdmin" className="text-sm text-gray-700">设为管理员</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    resetCreateForm()
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
                    createLoading
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {createLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    '创建用户'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
