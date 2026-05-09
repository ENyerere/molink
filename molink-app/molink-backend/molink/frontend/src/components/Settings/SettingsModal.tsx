import { useState } from 'react'
import { X, User, Bell, Lock, Palette } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../hooks/useTheme'

interface SettingsModalProps {
  onClose: () => void
}

type SettingsTab = 'profile' | 'notifications' | 'security' | 'appearance'

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  const tabs = [
    { id: 'profile' as SettingsTab, label: '个人资料', icon: User },
    { id: 'notifications' as SettingsTab, label: '通知', icon: Bell },
    { id: 'security' as SettingsTab, label: '安全', icon: Lock },
    { id: 'appearance' as SettingsTab, label: '外观', icon: Palette },
  ]

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[600px] flex overflow-hidden dark:bg-[#1e1e1e] dark:border dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        {/* 侧边栏 */}
        <div className="w-56 bg-gray-50 border-r border-gray-200 p-4 dark:bg-[#191919] dark:border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">设置</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-200 rounded transition dark:hover:bg-gray-800"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition text-left ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700 dark:bg-purple-900/40 dark:text-purple-100'
                    : 'hover:bg-gray-100 text-gray-700 dark:hover:bg-gray-800 dark:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 p-6 overflow-auto bg-white dark:bg-[#1e1e1e] dark:text-gray-200">
          {activeTab === 'profile' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6 dark:text-gray-100">个人资料</h3>
              
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center dark:bg-purple-900/40">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full rounded-full" />
                    ) : (
                      <User className="w-10 h-10 text-primary-600 dark:text-purple-300" />
                    )}
                  </div>
                  <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition dark:border-gray-600 dark:hover:bg-gray-800">
                    更换头像
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                    姓名
                  </label>
                  <input
                    type="text"
                    defaultValue={user?.full_name || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                    placeholder="输入您的姓名"
                  />
                </div>

                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition dark:bg-purple-600 dark:hover:bg-purple-700">
                  保存更改
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6 dark:text-gray-100">通知设置</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">邮件通知</span>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded dark:bg-gray-800 dark:border-gray-600" />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">浏览器通知</span>
                  <input type="checkbox" className="w-5 h-5 rounded dark:bg-gray-800 dark:border-gray-600" />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">协作提醒</span>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded dark:bg-gray-800 dark:border-gray-600" />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6 dark:text-gray-100">安全设置</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">修改密码</h4>
                  <div className="space-y-3">
                    <input
                      type="password"
                      placeholder="当前密码"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                    />
                    <input
                      type="password"
                      placeholder="新密码"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                    />
                    <input
                      type="password"
                      placeholder="确认新密码"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                    />
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition dark:bg-purple-600 dark:hover:bg-purple-700">
                      更新密码
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6 dark:text-gray-100">外观设置</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                    主题
                  </label>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setTheme('light')}
                      className={`px-4 py-2 border rounded-lg transition ${
                        theme === 'light' 
                          ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-purple-500 dark:bg-purple-900/40 dark:text-purple-100' 
                          : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      浅色
                    </button>
                    <button 
                      onClick={() => setTheme('dark')}
                      className={`px-4 py-2 border rounded-lg transition ${
                        theme === 'dark' 
                          ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-purple-500 dark:bg-purple-900/40 dark:text-purple-100' 
                          : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      深色
                    </button>
                    <button 
                      onClick={() => setTheme('system')}
                      className={`px-4 py-2 border rounded-lg transition ${
                        theme === 'system' 
                          ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-purple-500 dark:bg-purple-900/40 dark:text-purple-100' 
                          : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      跟随系统
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
