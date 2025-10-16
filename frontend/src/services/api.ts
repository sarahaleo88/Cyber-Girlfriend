// API service for backend communication

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

class ApiService {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Health check
  async healthCheck() {
    return this.request('/health')
  }

  // WebSocket status
  async getWebSocketStatus() {
    return this.request('/ws/status')
  }

  // User management
  async createUser(userData: { name: string; email?: string; avatar?: string }) {
    return this.request('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async getUser(userId: string) {
    return this.request(`/api/users/${userId}`)
  }

  async updateUserPreferences(userId: string, preferences: any) {
    return this.request(`/api/users/${userId}/preferences`, {
      method: 'PUT',
      body: JSON.stringify(preferences),
    })
  }

  // Conversations
  async createConversation(userId: string, title?: string) {
    return this.request('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ userId, title }),
    })
  }

  async getConversation(conversationId: string) {
    return this.request(`/api/conversations/${conversationId}`)
  }

  async getMessages(conversationId: string) {
    return this.request(`/api/conversations/${conversationId}/messages`)
  }

  async addMessage(conversationId: string, messageData: any) {
    return this.request(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    })
  }

  // Voice services
  async synthesizeVoice(data: {
    text: string
    voiceSettings: any
    emotion?: string
  }) {
    return this.request('/api/voice/synthesize', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async transcribeAudio(data: { audioData: string; format: string }) {
    return this.request('/api/voice/transcribe', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getAvailableVoices() {
    return this.request('/api/voice/voices')
  }

  async analyzeEmotion(text: string) {
    return this.request('/api/voice/analyze-emotion', {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
  }
}

export const apiService = new ApiService()
export default ApiService