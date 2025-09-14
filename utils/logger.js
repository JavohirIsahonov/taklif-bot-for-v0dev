const fs = require("fs")
const path = require("path")

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, "..", "logs")
    this.logFile = path.join(this.logDir, "bot.log")

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      data,
    }

    const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}${data ? " | " + JSON.stringify(data) : ""}\n`

    // Console output
    console.log(logLine.trim())

    // File output
    try {
      fs.appendFileSync(this.logFile, logLine)
    } catch (error) {
      console.error("Failed to write to log file:", error.message)
    }
  }

  info(message, data = null) {
    this.log("info", message, data)
  }

  error(message, data = null) {
    this.log("error", message, data)
  }

  warn(message, data = null) {
    this.log("warn", message, data)
  }

  debug(message, data = null) {
    this.log("debug", message, data)
  }
}

module.exports = new Logger()
