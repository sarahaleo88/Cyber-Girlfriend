// WebSocket service for real-time communication

export interface WebSocketMessage {
  type: 'audio' | 'text' | 'emotion' | 'status' | 'auth' | 'ping' | 'pong' | 'voice_request' | 'emotion_update'
  data: any
  timestamp: Date
}

export type WebSocketEventHandler = (message: WebSocketMessage) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private pingInterval: number | null = null
  private eventHandlers: Map<string, WebSocketEventHandler[]> = new Map()

  constructor(url: string = 'ws://localhost:8001') {
    this.url = url
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log('🔌 WebSocket connected')
          this.reconnectAttempts = 0
          this.startPingInterval()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason)
          this.stopPingInterval()

          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  disconnect(): void {
    if (this.ws) {
      this.stopPingInterval()
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
  }

  send(message: Omit<WebSocketMessage, 'timestamp'>): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected')
      return false
    }

    try {
      const fullMessage: WebSocketMessage = {
        ...message,
        timestamp: new Date(),
      }
      this.ws.send(JSON.stringify(fullMessage))
      return true
    } catch (error) {
      console.error('Failed to send WebSocket message:', error)
      return false
    }
  }

  // Authentication
  authenticate(userId: string, conversationId?: string): boolean {
    return this.send({
      type: 'auth',
      data: { userId, conversationId },
    })
  }

  // Send audio data
  sendAudio(audioData: string, format: string = 'wav'): boolean {
    return this.send({
      type: 'audio',
      data: { audioData, format },
    })
  }

  // Send text message
  sendText(text: string): boolean {
    return this.send({
      type: 'text',
      data: { text },
    })
  }

  // Request voice synthesis
  requestVoice(text: string, emotion?: string): boolean {
    return this.send({
      type: 'voice_request',
      data: { text, emotion },
    })
  }

  // Update emotion
  updateEmotion(emotion: string, intensity: number = 1.0): boolean {
    return this.send({
      type: 'emotion_update',
      data: { emotion, intensity },
    })
  }

  // Event handlers
  on(eventType: string, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, [])
    }
    this.eventHandlers.get(eventType)!.push(handler)
  }

  off(eventType: string, handler: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  // Convenience methods for common events
  onConnect(handler: () => void): void {
    this.on('connect', handler)
  }

  onDisconnect(handler: () => void): void {
    this.on('disconnect', handler)
  }

  onAudio(handler: (data: any) => void): void {
    this.on('audio', (message) => handler(message.data))
  }

  onText(handler: (data: any) => void): void {
    this.on('text', (message) => handler(message.data))
  }

  onEmotion(handler: (data: any) => void): void {
    this.on('emotion', (message) => handler(message.data))
  }

  onStatus(handler: (data: any) => void): void {
    this.on('status', (message) => handler(message.data))
  }

  // Connection status
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  get connectionState(): string {
    if (!this.ws) return 'DISCONNECTED'

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING'
      case WebSocket.OPEN:
        return 'CONNECTED'
      case WebSocket.CLOSING:
        return 'CLOSING'
      case WebSocket.CLOSED:
        return 'CLOSED'
      default:
        return 'UNKNOWN'
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.eventHandlers.get(message.type)
    if (handlers) {
      handlers.forEach(handler => handler(message))
    }

    // Handle special message types
    switch (message.type) {
      case 'status':
        if (message.data.status === 'connected') {
          this.emitEvent('connect')
        }
        break
      case 'pong':
        // Handle pong response
        break
    }
  }

  private emitEvent(eventType: string, data?: any): void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      handlers.forEach(handler => {
        handler({ type: eventType as any, data, timestamp: new Date() })
      })
    }
  }

  private startPingInterval(): void {
    this.pingInterval = window.setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping', data: {} })
      }
    }, 30000) // Ping every 30 seconds
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error)
        })
      }
    }, delay)
  }
}

// Create singleton instance
export const wsService = new WebSocketService()
export default WebSocketService