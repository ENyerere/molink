import { useEffect, useRef, useState, useCallback } from 'react'

interface WebSocketMessage {
  type: string
  [key: string]: any
}

interface UseWebSocketOptions {
  url: string
  token: string
  onMessage?: (message: WebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  reconnectInterval?: number
}

export function useWebSocket({
  url,
  token,
  onMessage,
  onConnect,
  onDisconnect,
  reconnectInterval = 3000,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const pingIntervalRef = useRef<number | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    const wsUrl = `${url}?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      setIsConnected(true)
      setError(null)
      onConnect?.()

      // 设置心跳
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 30000)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type !== 'pong') {
          onMessage?.(message)
        }
      } catch (err) {
        console.error('WebSocket message parse error:', err)
      }
    }

    ws.onerror = () => {
      setError('WebSocket连接错误')
    }

    ws.onclose = () => {
      setIsConnected(false)
      onDisconnect?.()

      // 清理心跳
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }

      // 尝试重连
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, reconnectInterval)
    }

    wsRef.current = ws
  }, [url, token, onMessage, onConnect, onDisconnect, reconnectInterval])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    error,
    send,
    disconnect,
    reconnect: connect,
  }
}

// 编辑器协作钩子
export function useEditorCollaboration(pageId: string) {
  const token = localStorage.getItem('access_token') || ''
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [cursors, setCursors] = useState<Record<string, any>>({})

  const { isConnected, send } = useWebSocket({
    url: `ws://${window.location.host}/ws/editor/${pageId}`,
    token,
    onMessage: (message) => {
      switch (message.type) {
        case 'current_users':
          setCollaborators(message.users || [])
          break
        case 'user_joined':
          setCollaborators(prev => [...prev, message.user])
          break
        case 'user_left':
          setCollaborators(prev => prev.filter(u => u.id !== message.user.id))
          setCursors(prev => {
            const newCursors = { ...prev }
            delete newCursors[message.user.id]
            return newCursors
          })
          break
        case 'cursor_update':
          setCursors(prev => ({
            ...prev,
            [message.user.id]: message.cursor
          }))
          break
      }
    },
  })

  const sendCursorMove = useCallback((cursor: any) => {
    send({ type: 'cursor_move', cursor })
  }, [send])

  const sendContentChange = useCallback((blockId: string, content: any) => {
    send({ type: 'content_change', block_id: blockId, content })
  }, [send])

  const sendBlockCreate = useCallback((block: any) => {
    send({ type: 'block_create', block })
  }, [send])

  const sendBlockDelete = useCallback((blockId: string) => {
    send({ type: 'block_delete', block_id: blockId })
  }, [send])

  const sendBlockReorder = useCallback((blockIds: string[]) => {
    send({ type: 'block_reorder', block_ids: blockIds })
  }, [send])

  return {
    isConnected,
    collaborators,
    cursors,
    sendCursorMove,
    sendContentChange,
    sendBlockCreate,
    sendBlockDelete,
    sendBlockReorder,
  }
}
