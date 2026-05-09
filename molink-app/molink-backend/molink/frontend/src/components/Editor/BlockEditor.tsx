import { useState, useRef, useEffect } from 'react'
import { Block, BlockType } from '../../types'
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  List,
  ListOrdered,
  Image as ImageIcon,
  Code,
  Quote,
  GripVertical,
  Bold,
  Italic,
  Underline,
  Strikethrough,
} from 'lucide-react'

interface BlockEditorProps {
  block: Block
  onUpdate: (updates: Partial<Block>) => void
  onDelete: () => void
  onEnter: () => void
  autoFocus?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  isDragging?: boolean
}

export default function BlockEditor({ 
  block, 
  onUpdate, 
  onDelete, 
  onEnter,
  autoFocus,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: BlockEditorProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showFormatBar, setShowFormatBar] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const updateTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (autoFocus && contentRef.current) {
      contentRef.current.focus()
      // 将光标移动到末尾
      const range = document.createRange()
      const selection = window.getSelection()
      const lastChild = contentRef.current.lastChild
      if (lastChild) {
        if (lastChild.nodeType === Node.TEXT_NODE) {
          range.setStart(lastChild, lastChild.textContent?.length || 0)
        } else {
          range.selectNodeContents(contentRef.current)
        }
        range.collapse(false)
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
    }
  }, [autoFocus])

  // 仅在初始化时设置内容
  useEffect(() => {
    if (!contentRef.current) return
    
    const isFocused = document.activeElement === contentRef.current
    const currentHTML = contentRef.current.innerHTML
    const newHTML = block.content.text || ''
    
    // 只在未获得焦点且不在输入中时同步外部更新
    if (!isFocused && !isComposing && currentHTML !== newHTML) {
      contentRef.current.innerHTML = newHTML
    }
  }, [block.content.text, isComposing])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])


  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const updateContent = () => {
    if (!contentRef.current) return
    const newContent = contentRef.current.innerHTML
    onUpdate({ content: { ...block.content, text: newContent } })
  }

  const handleInput = () => {
    // 如果正在输入中文，不做任何处理
    if (isComposing) return
    
    // 清除之前的定时器
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }
    
    // 防抖：300ms后更新
    updateTimeoutRef.current = window.setTimeout(() => {
      updateContent()
    }, 300)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // 如果正在输入中文，不处理特殊按键
    if (isComposing) return
    
    const content = contentRef.current?.textContent || ''
    
    // 快捷键处理
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault()
          applyFormat('bold')
          return
        case 'i':
          e.preventDefault()
          applyFormat('italic')
          return
        case 'u':
          e.preventDefault()
          applyFormat('underline')
          return
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onEnter()
    } else if (e.key === 'Backspace' && content === '' && contentRef.current) {
      e.preventDefault()
      onDelete()
    } else if (e.key === '/' && content === '') {
      e.preventDefault()
      setShowMenu(true)
    }
  }

  const applyFormat = (format: string) => {
    document.execCommand(format, false)
    contentRef.current?.focus()
  }

  const changeBlockType = (newType: BlockType) => {
    onUpdate({ block_type: newType })
    setShowMenu(false)
    setTimeout(() => contentRef.current?.focus(), 0)
  }

  const blockTypes = [
    { type: 'text' as BlockType, icon: Type, label: '文本' },
    { type: 'h1' as BlockType, icon: Heading1, label: '大标题' },
    { type: 'h2' as BlockType, icon: Heading2, label: '中标题' },
    { type: 'h3' as BlockType, icon: Heading3, label: '小标题' },
    { type: 'h4' as BlockType, icon: Heading4, label: '标题 4' },
    { type: 'h5' as BlockType, icon: Heading5, label: '标题 5' },
    { type: 'h6' as BlockType, icon: Heading6, label: '标题 6' },
    { type: 'ul' as BlockType, icon: List, label: '无序列表' },
    { type: 'ol' as BlockType, icon: ListOrdered, label: '有序列表' },
    { type: 'quote' as BlockType, icon: Quote, label: '引用' },
    { type: 'code' as BlockType, icon: Code, label: '代码' },
    { type: 'image' as BlockType, icon: ImageIcon, label: '图片' },
  ]

  const getBlockStyle = () => {
    switch (block.block_type) {
      case 'h1':
        return 'text-4xl font-bold text-text-main dark:text-white mb-2'
      case 'h2':
        return 'text-3xl font-bold text-text-main dark:text-white mb-2'
      case 'h3':
        return 'text-2xl font-bold text-text-main dark:text-white mb-1'
      case 'h4':
        return 'text-xl font-bold text-text-main dark:text-white mb-1'
      case 'h5':
        return 'text-lg font-bold text-text-main dark:text-white'
      case 'h6':
        return 'text-base font-bold text-text-main dark:text-white'
      case 'quote':
        return 'border-l-4 border-blue-500 dark:border-blue-400 pl-4 italic text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 py-2 rounded-r'
      case 'code':
        return 'font-mono bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded text-sm text-gray-800 dark:text-gray-200 overflow-x-auto'
      case 'ul':
        return 'pl-6 list-disc text-text-main dark:text-gray-200'
      case 'ol':
        return 'pl-6 list-decimal text-text-main dark:text-gray-200'
      default:
        return 'text-base text-text-main dark:text-gray-200 leading-relaxed'
    }
  }

  const getPlaceholder = () => {
    switch (block.block_type) {
      case 'h1':
        return '标题 1'
      case 'h2':
        return '标题 2'
      case 'h3':
        return '标题 3'
      case 'quote':
        return '引用'
      case 'code':
        return '代码'
      default:
        return '输入 / 显示命令菜单'
    }
  }

  return (
    <div 
      className={`block-container group relative ${isDragging ? 'opacity-50' : ''}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-start gap-2 relative -ml-10 pl-2">
        <div className="block-handle flex items-center gap-0.5 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity absolute right-full top-0 pr-1 h-full">
          <div
            draggable={!!onDragStart}
            onDragStart={onDragStart}
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-grab active:cursor-grabbing text-gray-400"
            title="点击打开菜单，拖动调整顺序"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        </div>

        <div className="flex-1 min-w-0 relative">
          {block.block_type === 'image' ? (
            <div className="space-y-2">
              {block.content.url && (
                <img 
                  src={block.content.url} 
                  alt={block.content.caption || 'Image'}
                  className="max-w-full rounded-lg"
                />
              )}
              <input
                type="text"
                value={block.content.caption || ''}
                onChange={(e) => onUpdate({ content: { ...block.content, caption: e.target.value } })}
                placeholder="添加图片说明..."
                className="w-full px-2 py-1 text-sm text-gray-600 dark:text-gray-400 outline-none bg-transparent"
              />
            </div>
          ) : (
            <>
              <div
                ref={contentRef}
                contentEditable
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => {
                  setIsComposing(true)
                  // 清除防抖定时器
                  if (updateTimeoutRef.current) {
                    clearTimeout(updateTimeoutRef.current)
                  }
                }}
                onCompositionEnd={() => {
                  setIsComposing(false)
                  // composition结束后立即更新
                  updateContent()
                }}
                onMouseUp={() => {
                  const selection = window.getSelection()
                  setShowFormatBar(!!selection && selection.toString().length > 0)
                }}
                onBlur={() => {
                  // 失去焦点时清除定时器并立即保存
                  if (updateTimeoutRef.current) {
                    clearTimeout(updateTimeoutRef.current)
                  }
                  updateContent()
                }}
                data-placeholder={getPlaceholder()}
                className={`editor-content outline-none ${getBlockStyle()}`}
                suppressContentEditableWarning
              />

              {/* 格式化工具栏 */}
              {showFormatBar && (
                <div className="absolute -top-12 left-0 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl px-1 py-1 flex items-center gap-1 z-20">
                  <button
                    onClick={() => applyFormat('bold')}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 transition"
                    title="加粗 (Ctrl+B)"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => applyFormat('italic')}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 transition"
                    title="斜体 (Ctrl+I)"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => applyFormat('underline')}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 transition"
                    title="下划线 (Ctrl+U)"
                  >
                    <Underline className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => applyFormat('strikeThrough')}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 transition"
                    title="删除线"
                  >
                    <Strikethrough className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showMenu && (
        <div
          ref={menuRef}
          className="absolute left-0 top-full mt-2 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-2 z-10 w-72 max-h-96 overflow-y-auto"
        >
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-2 mb-1 border-b border-gray-100 dark:border-gray-700">
            转换块类型
          </div>
          <div className="py-1">
            {blockTypes.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => changeBlockType(type)}
                className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition text-left ${
                  block.block_type === type ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
                }`}
              >
                <Icon className={`w-4 h-4 ${
                  block.block_type === type ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                }`} />
                <span className={`text-sm ${
                  block.block_type === type ? 'font-medium' : 'text-gray-700 dark:text-gray-300'
                }`}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
