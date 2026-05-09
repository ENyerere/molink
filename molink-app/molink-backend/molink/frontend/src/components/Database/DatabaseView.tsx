import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { databasesApi, fieldsApi, recordsApi } from '../../api/databases'
import { Database, DatabaseField, DatabaseRecord, Workspace } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { Plus, Table as TableIcon, LayoutGrid, Calendar, Trash2 } from 'lucide-react'

interface DatabaseViewProps {
  workspace: Workspace
}

export default function DatabaseView({ workspace: _ }: DatabaseViewProps) {
  const { databaseId } = useParams<{ databaseId: string }>()
  const { user } = useAuth()
  const [database, setDatabase] = useState<Database | null>(null)
  const [fields, setFields] = useState<DatabaseField[]>([])
  const [records, setRecords] = useState<DatabaseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [databaseName, setDatabaseName] = useState('')

  useEffect(() => {
    if (databaseId) {
      loadDatabase()
      loadFields()
      loadRecords()
    }
  }, [databaseId])

  const loadDatabase = async () => {
    if (!databaseId) return

    try {
      const data = await databasesApi.get(databaseId)
      setDatabase(data)
      setDatabaseName(data.name)
    } catch (err) {
      console.error('Error loading database:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadFields = async () => {
    if (!databaseId) return

    try {
      const data = await fieldsApi.list(databaseId)
      setFields(data)
    } catch (err) {
      console.error('Error loading fields:', err)
    }
  }

  const loadRecords = async () => {
    if (!databaseId) return

    try {
      const data = await recordsApi.list(databaseId)
      setRecords(data)
    } catch (err) {
      console.error('Error loading records:', err)
    }
  }

  const updateDatabaseName = async () => {
    if (!databaseId || !database) return

    try {
      await databasesApi.update(databaseId, { name: databaseName })
      setDatabase({ ...database, name: databaseName })
      setEditingName(false)
    } catch (err) {
      console.error('Error updating database name:', err)
    }
  }

  const addField = async () => {
    if (!databaseId || !user) return

    try {
      const data = await fieldsApi.create(databaseId, {
        database_id: databaseId,
        name: '新字段',
        field_type: 'text',
        position: fields.length,
      })
      setFields([...fields, data])
    } catch (err) {
      console.error('Error adding field:', err)
    }
  }

  const addRecord = async () => {
    if (!databaseId || !user) return

    try {
      const data = await recordsApi.create(databaseId, {
        database_id: databaseId,
        properties: {},
        position: records.length,
      })
      setRecords([...records, data])
    } catch (err) {
      console.error('Error adding record:', err)
    }
  }

  const updateRecord = async (recordId: string, fieldId: string, value: any) => {
    const record = records.find(r => r.id === recordId)
    if (!record) return

    const newProperties = { ...record.properties, [fieldId]: value }

    try {
      await recordsApi.update(recordId, { properties: newProperties })
      setRecords(records.map(r =>
        r.id === recordId ? { ...r, properties: newProperties } : r
      ))
    } catch (err) {
      console.error('Error updating record:', err)
    }
  }

  const deleteRecord = async (recordId: string) => {
    if (!confirm('确定要删除这条记录吗？')) return

    try {
      await recordsApi.delete(recordId)
      setRecords(records.filter(r => r.id !== recordId))
    } catch (err) {
      console.error('Error deleting record:', err)
    }
  }

  const deleteField = async (fieldId: string) => {
    if (!confirm('确定要删除这个字段吗？')) return

    try {
      await fieldsApi.delete(fieldId)
      setFields(fields.filter(f => f.id !== fieldId))
    } catch (err) {
      console.error('Error deleting field:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!database) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">数据库未找到</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          {editingName ? (
            <input
              type="text"
              value={databaseName}
              onChange={(e) => setDatabaseName(e.target.value)}
              onBlur={updateDatabaseName}
              onKeyDown={(e) => e.key === 'Enter' && updateDatabaseName()}
              className="text-2xl font-bold outline-none border-b-2 border-primary-500"
              autoFocus
            />
          ) : (
            <h1
              onClick={() => setEditingName(true)}
              className="text-2xl font-bold cursor-pointer hover:text-primary-600"
            >
              {database.name}
            </h1>
          )}

          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
              <TableIcon className="w-4 h-4" />
              表格
            </button>
            <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              看板
            </button>
            <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              日历
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-full">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                {fields.map(field => (
                  <th key={field.id} className="px-4 py-3 text-left">
                    <div className="flex items-center justify-between group">
                      <span className="text-sm font-medium text-gray-700">
                        {field.name}
                      </span>
                      <button
                        onClick={() => deleteField(field.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition"
                      >
                        <Trash2 className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="w-20 px-4 py-3">
                  <button
                    onClick={addField}
                    className="p-1 hover:bg-gray-200 rounded transition"
                  >
                    <Plus className="w-4 h-4 text-gray-500" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => (
                <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50 group">
                  <td className="px-4 py-3 text-center text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <span>{index + 1}</span>
                      <button
                        onClick={() => deleteRecord(record.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition"
                      >
                        <Trash2 className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  </td>
                  {fields.map(field => (
                    <td key={field.id} className="px-4 py-3">
                      <input
                        type={field.field_type === 'number' ? 'number' : 'text'}
                        value={record.properties[field.id] || ''}
                        onChange={(e) => updateRecord(record.id, field.id, e.target.value)}
                        className="w-full px-2 py-1 text-sm border-none outline-none focus:bg-white bg-transparent"
                        placeholder="空"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3"></td>
                </tr>
              ))}
              <tr>
                <td colSpan={fields.length + 2} className="px-4 py-3">
                  <button
                    onClick={addRecord}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>新建记录</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
