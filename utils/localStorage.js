const fs = require("fs")
const path = require("path")

class LocalStorage {
  constructor() {
    this.dataDir = path.join(__dirname, "..", "data")
    this.usersFile = path.join(this.dataDir, "users.json")
    this.messagesFile = path.join(this.dataDir, "messages.json")

    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true })
    }

    // Initialize files if they don't exist
    this.initializeFiles()
  }

  initializeFiles() {
    if (!fs.existsSync(this.usersFile)) {
      fs.writeFileSync(this.usersFile, JSON.stringify([], null, 2))
    }

    if (!fs.existsSync(this.messagesFile)) {
      fs.writeFileSync(this.messagesFile, JSON.stringify([], null, 2))
    }
  }

  readUsers() {
    try {
      const data = fs.readFileSync(this.usersFile, "utf8")
      return JSON.parse(data)
    } catch (error) {
      console.error("[LocalStorage] Error reading users:", error.message)
      return []
    }
  }

  writeUsers(users) {
    try {
      fs.writeFileSync(this.usersFile, JSON.stringify(users, null, 2))
      return true
    } catch (error) {
      console.error("[LocalStorage] Error writing users:", error.message)
      return false
    }
  }

  readMessages() {
    try {
      const data = fs.readFileSync(this.messagesFile, "utf8")
      return JSON.parse(data)
    } catch (error) {
      console.error("[LocalStorage] Error reading messages:", error.message)
      return []
    }
  }

  writeMessages(messages) {
    try {
      fs.writeFileSync(this.messagesFile, JSON.stringify(messages, null, 2))
      return true
    } catch (error) {
      console.error("[LocalStorage] Error writing messages:", error.message)
      return false
    }
  }

  findUser(chatId) {
    const users = this.readUsers()
    return users.find((user) => user.chatId === chatId)
  }

  saveUser(userData) {
    const users = this.readUsers()
    const existingIndex = users.findIndex((user) => user.chatId === userData.chatId)

    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...userData }
    } else {
      users.push(userData)
    }

    return this.writeUsers(users)
  }

  saveMessage(messageData) {
    const messages = this.readMessages()
    messages.push(messageData)
    return this.writeMessages(messages)
  }

  updateUserActivity(chatId) {
    const users = this.readUsers()
    const userIndex = users.findIndex((user) => user.chatId === chatId)

    if (userIndex >= 0) {
      users[userIndex].lastActivity = new Date().toISOString()
      return this.writeUsers(users)
    }

    return false
  }
}

module.exports = LocalStorage
