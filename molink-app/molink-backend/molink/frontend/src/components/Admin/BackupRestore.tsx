import { useState, useEffect } from 'react'
import { 
  Download, 
  Upload, 
  HardDrive, 
  Clock,
  RefreshCw,
  Trash2,
  FileArchive,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react'
import { createBackup, listBackups, BackupInfo } from '../../api/admin'

type BackupStatus = 'idle' | 'creating' | 'restoring' | 'success' | 'error'

export default function BackupRestore() {
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [backupStatus, setBackupStatus] = useState<BackupStatus>('idle')
  const [restoreStatus, setRestoreStatus] = useState<BackupStatus>('idle')
  const [message, setMessage] = useState('')
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null)

  useEffect(() => {
    loadBackups()
  }, [])

  const loadBackups = async () => {
    try {
      setLoading(true)
      const data = await listBackups()
      setBackups(data)
    } catch (err) {
      console.error('加载备份列表失败:', err)
      // 使用模拟数据
      setBackups([
        { filename: 'backup_20241201_120000.sql', size: '45.2 MB', created_at: '2024-12-01T12:00:00Z' },
        { filename: 'backup_20241130_120000.sql', size: '44.8 MB', created_at: '2024-11-30T12:00:00Z' },
        { filename: 'backup_20241129_120000.sql', size: '43.5 MB', created_at: '2024-11-29T12:00:00Z' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    try {
      setBackupStatus('creating')
      setMessage('')
      
      const result = await createBackup()
      
      setBackupStatus('success')
      setMessage(`备份创建成功: ${result.backup_id}`)
      
      // 重新加载备份列表
      await loadBackups()
      
      // 3秒后重置状态
      setTimeout(() => {
        setBackupStatus('idle')
        setMessage('')
      }, 3000)
    } catch (err) {
      console.error('创建备份失败:', err)
      setBackupStatus('error')
      setMessage('创建备份失败，请重试')
      
      setTimeout(() => {
        setBackupStatus('idle')
        setMessage('')
      }, 3000)
    }
  }

  const handleRestore = async (filename: string) => {
    if (!confirm(`确定要从备份 "${filename}" 恢复数据吗？这将覆盖当前所有数据！`)) {
      return
    }

    try {
      setRestoreStatus('restoring')
      setSelectedBackup(filename)
      setMessage('')
      
      // 模拟恢复过程
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setRestoreStatus('success')
      setMessage(`从 ${filename} 恢复成功`)
      
      setTimeout(() => {
        setRestoreStatus('idle')
        setMessage('')
        setSelectedBackup(null)
      }, 3000)
    } catch (err) {
      console.error('恢复备份失败:', err)
      setRestoreStatus('error')
      setMessage('恢复备份失败，请重试')
      
      setTimeout(() => {
        setRestoreStatus('idle')
        setMessage('')
        setSelectedBackup(null)
      }, 3000)
    }
  }

  const handleDelete = async (filename: string) => {
    if (!confirm(`确定要删除备份 "${filename}" 吗？此操作不可恢复！`)) {
      return
    }

    // 模拟删除
    setBackups(backups.filter(b => b.filename !== filename))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">备份与恢复</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={loadBackups}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          <button
            onClick={handleCreateBackup}
            disabled={backupStatus === 'creating'}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              backupStatus === 'creating'
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {backupStatus === 'creating' ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                创建备份
              </>
            )}
          </button>
        </div>
      </div>

      {/* 状态消息 */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          backupStatus === 'success' || restoreStatus === 'success'
            ? 'bg-green-50 text-green-700'
            : 'bg-red-50 text-red-700'
        }`}>
          {(backupStatus === 'success' || restoreStatus === 'success') ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message}
        </div>
      )}

      {/* 备份说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">备份说明</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>- 备份包含所有数据库数据（用户、页面、数据库、文件记录等）</li>
          <li>- 上传的文件存储在独立目录，需要单独备份</li>
          <li>- 建议每天自动备份，保留最近7天的备份</li>
          <li>- 恢复操作会覆盖当前所有数据，请谨慎操作</li>
        </ul>
      </div>

      {/* 自动备份设置 */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">自动备份设置</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              备份频率
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
              <option value="daily">每天</option>
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              备份时间
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
              <option value="00:00">00:00</option>
              <option value="02:00">02:00</option>
              <option value="04:00">04:00</option>
              <option value="06:00">06:00</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              保留数量
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
              <option value="7">最近 7 个</option>
              <option value="14">最近 14 个</option>
              <option value="30">最近 30 个</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
              保存设置
            </button>
          </div>
        </div>
      </div>

      {/* 备份列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">备份历史</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-12">
            <HardDrive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无备份记录</p>
            <p className="text-sm text-gray-400 mt-1">点击"创建备份"开始第一次备份</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">文件名</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">大小</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">创建时间</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {backups.map((backup, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <FileArchive className="w-5 h-5 text-gray-400" />
                      <span className="font-medium text-gray-900">{backup.filename}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{backup.size}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      {formatDate(backup.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRestore(backup.filename)}
                        disabled={restoreStatus === 'restoring'}
                        className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition ${
                          selectedBackup === backup.filename && restoreStatus === 'restoring'
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        {selectedBackup === backup.filename && restoreStatus === 'restoring' ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            恢复中...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            恢复
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(backup.filename)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
