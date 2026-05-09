import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { pagesApi } from '../../api/pages'
import { blocksApi } from '../../api/blocks'
import { Page, Block, Workspace } from '../../types'
import BlockEditor from '../Editor/BlockEditor'
import { Image, Smile } from 'lucide-react'

interface PageEditorProps {
  workspace: Workspace
}

export default function PageEditor({ workspace: _ }: PageEditorProps) {
  const { pageId } = useParams<{ pageId: string }>()
  const [page, setPage] = useState<Page | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [focusedBlockIndex, setFocusedBlockIndex] = useState<number | null>(null)
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null)

  useEffect(() => {
    if (pageId) {
      loadPage()
      loadBlocks()
    }
  }, [pageId])

  const loadPage = async () => {
    if (!pageId) return

    try {
      const data = await pagesApi.get(pageId)
      setPage(data)
      setTitle(data.title)
    } catch (err) {
      console.error('Error loading page:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadBlocks = async () => {
    if (!pageId) return

    try {
      const data = await blocksApi.list(pageId)
      setBlocks(data)
      
      // 如果没有块，创建一个默认块
      if (data.length === 0) {
        await createBlock()
      }
    } catch (err) {
      console.error('Error loading blocks:', err)
    }
  }

  const updateTitle = async (newTitle: string) => {
    setTitle(newTitle)
    if (!pageId || !page) return

    // Debounce this in a real app, for now we save on blur or with a delay
    // Here we just update local state and maybe save on blur
  }

  const handleTitleBlur = async () => {
    if (!pageId || !page) return
    try {
      if (title !== page.title) {
      await pagesApi.update(pageId, { title })
      setPage({ ...page, title })
      }
    } catch (err) {
      console.error('Error updating title:', err)
    }
  }

  const createBlock = async (afterIndex?: number) => {
    if (!pageId) return

    try {
      const position = afterIndex !== undefined ? afterIndex + 1 : blocks.length
      const newBlock = await blocksApi.create({
        page_id: pageId,
        block_type: 'text',
        content: { text: '' },
        position
      })

      if (afterIndex !== undefined) {
        const newBlocks = [...blocks]
        newBlocks.splice(afterIndex + 1, 0, newBlock)
        setBlocks(newBlocks)
        setFocusedBlockIndex(afterIndex + 1)
      } else {
        setBlocks([...blocks, newBlock])
        setFocusedBlockIndex(blocks.length)
      }
    } catch (err) {
      console.error('Error creating block:', err)
    }
  }

  const updateBlock = useCallback(async (blockId: string, updates: Partial<Block>) => {
    try {
      await blocksApi.update(blockId, updates)
      setBlocks(blocks.map(b => 
        b.id === blockId ? { ...b, ...updates } : b
      ))
    } catch (err) {
      console.error('Error updating block:', err)
    }
  }, [blocks])

  const deleteBlock = async (blockId: string, index: number) => {
    if (blocks.length <= 1) return // 保留至少一个块

    try {
      await blocksApi.delete(blockId)
      const newBlocks = blocks.filter(b => b.id !== blockId)
      setBlocks(newBlocks)
      
      // 聚焦到上一个块
      if (index > 0) {
        setFocusedBlockIndex(index - 1)
      }
    } catch (err) {
      console.error('Error deleting block:', err)
    }
  }

  const handleDragStart = (blockId: string) => {
    setDraggedBlockId(blockId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (targetIndex: number) => {
    if (!draggedBlockId) return

    const draggedIndex = blocks.findIndex(b => b.id === draggedBlockId)
    if (draggedIndex === targetIndex) {
      setDraggedBlockId(null)
      return
    }

    const newBlocks = [...blocks]
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1)
    newBlocks.splice(targetIndex, 0, draggedBlock)
    
    setBlocks(newBlocks)
    setDraggedBlockId(null)

    // 更新服务器上的顺序
    try {
      const blockIds = newBlocks.map(b => b.id)
      await blocksApi.reorder(pageId!, blockIds)
    } catch (err) {
      console.error('Error reordering blocks:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">页面未找到</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-12 py-16">
      {/* 页面头部: 封面/图标/标题 */}
      <div className="group mb-8 relative">
        {/* Cover / Icon buttons (visible on hover of header area) */}
        <div className="flex items-center gap-4 mb-4 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-0">
          <button className="flex items-center gap-1 text-xs text-gray-500 hover:bg-gray-100 px-2 py-1 rounded transition">
            <Smile className="w-3 h-3" />
            添加图标
          </button>
          <button className="flex items-center gap-1 text-xs text-gray-500 hover:bg-gray-100 px-2 py-1 rounded transition">
            <Image className="w-3 h-3" />
            添加封面
          </button>
        </div>

          <input
            type="text"
            value={title}
          onChange={(e) => updateTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="无标题"
          className="text-4xl font-bold text-text-main placeholder-gray-300 w-full bg-transparent border-none outline-none p-0"
        />
      </div>

      {/* 内容块 */}
      <div className="space-y-1 pb-32">
        {blocks.map((block, index) => (
          <BlockEditor
            key={block.id}
            block={block}
            onUpdate={(updates) => updateBlock(block.id, updates)}
            onDelete={() => deleteBlock(block.id, index)}
            onEnter={() => createBlock(index)}
            autoFocus={focusedBlockIndex === index}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move'
              handleDragStart(block.id)
            }}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(index)}
            isDragging={draggedBlockId === block.id}
          />
        ))}

        {/* 点击底部空白区域创建新块 */}
        <div 
          className="h-32 -z-10 cursor-text"
          onClick={() => createBlock()}
        />
      </div>
    </div>
  )
}
