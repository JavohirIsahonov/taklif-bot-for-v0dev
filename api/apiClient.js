const axios = require("axios")

class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL
    this.isOnline = false
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "USAT-Telegram-Bot/1.0",
      },
    })

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error("[API] Request error:", error.message)
        return Promise.reject(error)
      },
    )

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[API] Response ${response.status} from ${response.config.url}`)
        this.isOnline = true
        return response
      },
      (error) => {
        console.error(`[API] Response error: ${error.response?.status} - ${error.message}`)
        this.isOnline = false
        return Promise.reject(error)
      },
    )
  }

  async checkUserExists(chatId) {
    try {
      const response = await this.client.get("/users")
      const responseData = response.data

      console.log("[API] Users API response:", JSON.stringify(responseData, null, 2))

      // Check if response has the expected structure
      if (responseData && responseData.success && responseData.data && responseData.data.users) {
        const users = responseData.data.users
        if (Array.isArray(users)) {
          const foundUser = users.find((user) => user.chatId === chatId.toString())
          console.log("[API] Found user:", foundUser)
          return foundUser
        }
      }

      console.log("[API] Unexpected response format:", responseData)
      return null
    } catch (error) {
      console.error("Error checking user existence:", error.message)
      this.isOnline = false

      if (error.code === "ECONNABORTED") {
        throw new Error("Connection timeout - server may be slow")
      }
      if (error.response?.status === 404) {
        console.log("[API] Users endpoint not found or user doesn't exist")
        return null
      }
      throw new Error("Failed to check user existence")
    }
  }

  async registerUser(userData) {
    try {
      // Validate required fields
      const requiredFields = ["chatId", "fullName", "phone", "course", "direction"]
      for (const field of requiredFields) {
        if (!userData[field]) {
          throw new Error(`Missing required field: ${field}`)
        }
      }

      // Remove synced field before sending to API
      const { synced, ...apiUserData } = userData

      const response = await this.client.post("/users", apiUserData)
      console.log(`[API] User registered successfully: ${userData.fullName}`)
      this.isOnline = true
      return response.data
    } catch (error) {
      console.error("Error registering user:", error.message)
      this.isOnline = false

      if (error.response?.status === 409) {
        throw new Error("User already exists")
      }
      if (error.response?.status === 400) {
        throw new Error("Invalid user data provided")
      }
      throw new Error("Failed to register user")
    }
  }

  async saveMessage(messageData) {
    try {
      const requiredFields = ["messageId", "userId", "chatId", "timestamp", "status", "ticketType", "text", "language", "isactive"]
      for (const field of requiredFields) {
        if (!messageData[field] && messageData[field] !== false) { // Allow false for isactive
          throw new Error(`Missing required field: ${field}`)
        }
      }

      // For suggestions, substatus can be null, for complaints it's required
      if (messageData.ticketType === "complaint" && !messageData.substatus) {
        throw new Error("Missing required field: substatus")
      }

      if (messageData.text.trim().length === 0) {
        throw new Error("Message text cannot be empty")
      }

      if (messageData.text.length > 1000) {
        throw new Error("Message text too long (max 1000 characters)")
      }

      const { 
        synced, 
        ticketNumber, 
        fullName, 
        category, 
        priority, 
        ...apiMessageData 
      } = messageData

      console.log("[API] Sending message data to API:", JSON.stringify(apiMessageData, null, 2))

      const response = await this.client.post("/messages", apiMessageData)
      console.log(`[API] Message saved successfully: ${messageData.ticketType}`)
      this.isOnline = true
      return response.data
    } catch (error) {
      console.error("Error saving message:", error.message)
      this.isOnline = false

      if (error.response?.status === 400) {
        throw new Error("Invalid message data provided")
      }
      if (error.response?.status === 413) {
        throw new Error("Message too large")
      }
      throw new Error("Failed to save message")
    }
  }

  async getUserMessages(chatId, limit = 10) {
    try {
      const response = await this.client.get(`/messages?userId=${chatId}&limit=${limit}`)
      this.isOnline = true
      return response.data
    } catch (error) {
      console.error("Error fetching user messages:", error.message)
      this.isOnline = false
      throw new Error("Failed to fetch user messages")
    }
  }

  async updateUserActivity(chatId) {
    try {
      const updateData = {
        lastActivity: new Date().toISOString(),
      }
      await this.client.patch(`/users/${chatId}`, updateData)
      this.isOnline = true
    } catch (error) {
      console.error("Error updating user activity:", error.message)
      this.isOnline = false
      // Don't throw error for activity updates as it's not critical
    }
  }

  async healthCheck() {
    try {
      console.log("[API] Checking API availability using /users endpoint...")
      const response = await this.client.get("/users")
      this.isOnline = true
      return response.status === 200
    } catch (error) {
      console.error("API availability check failed:", error.message)

      try {
        console.log("[API] Trying root endpoint as fallback...")
        const response = await this.client.get("/")
        this.isOnline = true
        return response.status === 200
      } catch (fallbackError) {
        console.error("Root endpoint also failed:", fallbackError.message)
        this.isOnline = false
        return false
      }
    }
  }

  getStatus() {
    return {
      isOnline: this.isOnline,
      baseURL: this.baseURL,
    }
  }
}

module.exports = APIClient
