import { WebSocket, WebSocketServer } from 'ws'
import type { WebSocketMessage } from '../types'

interface ConnectedClient {
  id: string
  ws: WebSocket
  userId?: string
  conversationId?: string
  lastPing: Date
}

export class VoiceWebSocketManager {
  private wss: WebSocketServer
  private clients: Map<string, ConnectedClient> = new Map()
  private pingInterval: NodeJS.Timeout

  constructor(port: number = 8001) {
    this.wss = new WebSocketServer({ port })
    this.setupWebSocketServer()
    this.startPingInterval()
    console.log(`🔌 WebSocket server started on port ${port}`)
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId()
      const client: ConnectedClient = {
        id: clientId,
        ws,
        lastPing: new Date(),
      }

      this.clients.set(clientId, client)
      console.log(`👋 Client connected: ${clientId}`)

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'status',
        data: { status: 'connected', clientId },
        timestamp: new Date(),
      })

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleClientMessage(clientId, message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
          this.sendToClient(clientId, {
            type: 'status',
            data: { error: 'Invalid message format' },
            timestamp: new Date(),
          })
        }
      })

      // Handle client disconnect
      ws.on('close', () => {
        console.log(`👋 Client disconnected: ${clientId}`)
        this.clients.delete(clientId)
      })

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error)
        this.clients.delete(clientId)
      })

      // Handle ping/pong for connection health
      ws.on('pong', () => {
        const client = this.clients.get(clientId)
        if (client) {
          client.lastPing = new Date()
        }
      })
    })

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error)
    })
  }

  private handleClientMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId)
    if (!client) return

    switch (message.type) {
      case 'auth':
        // Authenticate client and associate with user
        client.userId = message.data.userId
        client.conversationId = message.data.conversationId
        console.log(`🔐 Client ${clientId} authenticated as user ${client.userId}`)
        this.sendToClient(clientId, {
          type: 'status',
          data: { status: 'authenticated' },
          timestamp: new Date(),
        })
        break

      case 'audio':
        // Handle audio data (speech-to-text)
        this.handleAudioMessage(clientId, message.data)
        break

      case 'text':
        // Handle text message
        this.handleTextMessage(clientId, message.data)
        break

      case 'voice_request':
        // Handle voice synthesis request
        this.handleVoiceRequest(clientId, message.data)
        break

      case 'emotion_update':
        // Handle emotion state update
        this.handleEmotionUpdate(clientId, message.data)
        break

      case 'ping':
        // Respond to ping
        this.sendToClient(clientId, {
          type: 'pong',
          data: { timestamp: new Date() },
          timestamp: new Date(),
        })
        break

      default:
        console.warn(`Unknown message type: ${message.type}`)
        this.sendToClient(clientId, {
          type: 'status',
          data: { error: 'Unknown message type' },
          timestamp: new Date(),
        })
    }
  }

  private async handleAudioMessage(clientId: string, audioData: any) {
    try {
      // In production, this would:
      // 1. Process the audio data with speech-to-text
      // 2. Store the transcribed message
      // 3. Generate AI response
      // 4. Convert response to speech
      // 5. Send back audio response

      // Mock processing
      await this.simulateProcessingDelay(1000)

      // Send mock transcription
      this.sendToClient(clientId, {
        type: 'text',
        data: {
          transcription: 'Hello! I heard your voice message.',
          confidence: 0.95,
        },
        timestamp: new Date(),
      })

      // Send mock AI response
      await this.simulateProcessingDelay(1500)
      this.sendToClient(clientId, {
        type: 'audio',
        data: {
          audioUrl: 'https://example.com/response.mp3',
          text: 'Thank you for your message! How can I help you today?',
          emotion: 'friendly',
          duration: 3.2,
        },
        timestamp: new Date(),
      })
    } catch (error) {
      console.error('Error processing audio:', error)
      this.sendToClient(clientId, {
        type: 'status',
        data: { error: 'Failed to process audio' },
        timestamp: new Date(),
      })
    }
  }

  private async handleTextMessage(clientId: string, textData: any) {
    try {
      // Mock AI response generation
      await this.simulateProcessingDelay(800)

      const responses = [
        'That\'s really interesting! Tell me more about that.',
        'I understand how you feel. It sounds like that was important to you.',
        'Thanks for sharing that with me. What would you like to talk about next?',
        'I\'m here to listen. How has your day been going?',
        'That makes sense. I appreciate you opening up to me.',
      ]

      const randomResponse = responses[Math.floor(Math.random() * responses.length)]

      this.sendToClient(clientId, {
        type: 'text',
        data: {
          text: randomResponse,
          emotion: 'supportive',
          sender: 'ai',
        },
        timestamp: new Date(),
      })
    } catch (error) {
      console.error('Error processing text:', error)
      this.sendToClient(clientId, {
        type: 'status',
        data: { error: 'Failed to process text' },
        timestamp: new Date(),
      })
    }
  }

  private async handleVoiceRequest(clientId: string, voiceData: any) {
    try {
      // Mock voice synthesis
      await this.simulateProcessingDelay(1200)

      this.sendToClient(clientId, {
        type: 'audio',
        data: {
          audioUrl: `https://example.com/voice/${crypto.randomUUID()}.mp3`,
          text: voiceData.text,
          emotion: voiceData.emotion || 'calm',
          duration: Math.ceil(voiceData.text.length / 10),
        },
        timestamp: new Date(),
      })
    } catch (error) {
      console.error('Error processing voice request:', error)
      this.sendToClient(clientId, {
        type: 'status',
        data: { error: 'Failed to generate voice' },
        timestamp: new Date(),
      })
    }
  }

  private handleEmotionUpdate(clientId: string, emotionData: any) {
    // Broadcast emotion update to client
    this.sendToClient(clientId, {
      type: 'emotion',
      data: {
        emotion: emotionData.emotion,
        intensity: emotionData.intensity || 1.0,
      },
      timestamp: new Date(),
    })
  }

  private sendToClient(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId)
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false
    }

    try {
      client.ws.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error(`Failed to send message to client ${clientId}:`, error)
      this.clients.delete(clientId)
      return false
    }
  }

  public broadcastToUser(userId: string, message: WebSocketMessage) {
    let sent = 0
    for (const [clientId, client] of this.clients) {
      if (client.userId === userId) {
        if (this.sendToClient(clientId, message)) {
          sent++
        }
      }
    }
    return sent
  }

  public broadcastToConversation(conversationId: string, message: WebSocketMessage) {
    let sent = 0
    for (const [clientId, client] of this.clients) {
      if (client.conversationId === conversationId) {
        if (this.sendToClient(clientId, message)) {
          sent++
        }
      }
    }
    return sent
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private simulateProcessingDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      const now = new Date()
      const staleThreshold = 30000 // 30 seconds

      for (const [clientId, client] of this.clients) {
        const timeSinceLastPing = now.getTime() - client.lastPing.getTime()

        if (timeSinceLastPing > staleThreshold) {
          console.log(`🏓 Pinging stale client: ${clientId}`)
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.ping()
          } else {
            this.clients.delete(clientId)
          }
        }
      }
    }, 15000) // Check every 15 seconds
  }

  public getConnectedClients(): { count: number; clients: Array<{ id: string; userId?: string; conversationId?: string }> } {
    const clients = Array.from(this.clients.values()).map(client => ({
      id: client.id,
      userId: client.userId,
      conversationId: client.conversationId,
    }))

    return {
      count: clients.length,
      clients,
    }
  }

  public close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }

    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close()
      }
    }

    this.wss.close()
    console.log('🔌 WebSocket server closed')
  }
}