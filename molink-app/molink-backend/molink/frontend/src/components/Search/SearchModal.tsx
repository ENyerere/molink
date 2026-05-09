import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, Database, X } from 'lucide-react'
import { pagesApi } from '../../api/pages'
import { databasesApi } from '../../api/databases'
import { Page, Database as DatabaseType, Workspace } from '../../types'

interface SearchModalProps {
  workspace: Workspace
  onClose: () => void
}

export default function SearchModal({ workspace, onClose }: SearchModalProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [pages, setPages] = useState<Page[]>([])
  const [databases, setDatabases] = useState<DatabaseType[]>([])
  const [filteredItems, setFilteredItems] = useState<(Page | DatabaseType)[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const allItems = [...pages, ...databases]
    if (query.trim() === '') {
      setFilteredItems(allItems.slice(0, 10))
    } else {
      const filtered = allItems.filter(item => {
        const name = 'title' in item ? item.title : item.name
        return name.toLowerCase().includes(query.toLowerCase())
      })
      setFilteredItems(filtered)
    }
  }, [query, pages, databases])

  const loadData = async () => {
    try {
      const [pagesData, databasesData] = await Promise.all([
        pagesApi.list(workspace.id),
        databasesApi.list(workspace.id)
      ])
      setPages(pagesData)
      setDatabases(databasesData)
    } catch (err) {
      console.error('Error loading data:', err)
    }
  }

  const handleSelect = (item: Page | DatabaseType) => {
    if ('title' in item) {
      navigate(`/workspace/page/${item.id}`)
    } else {
      navigate(`/workspace/database/${item.id}`)
    }
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[20vh] z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索页面或数据库..."
            className="flex-1 outline-none text-gray-900 placeholder-gray-400"
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="max-h-80 overflow-auto">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              没有找到匹配的结果
            </div>
          ) : (
            <div className="py-2">
              {filteredItems.map(item => {
                const isPage = 'title' in item
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 transition text-left"
                  >
                    {isPage ? (
                      <FileText className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Database className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="text-sm text-gray-900">
                      {isPage ? (item as Page).title : (item as DatabaseType).name}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {isPage ? '页面' : '数据库'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
