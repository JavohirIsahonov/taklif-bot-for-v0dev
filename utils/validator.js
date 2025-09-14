class Validator {
  static validatePhoneNumber(phone) {
    // Uzbekistan phone number validation
    const phoneRegex = /^(\+998|998|8)?[0-9]{9}$/
    return phoneRegex.test(phone.replace(/[\s\-$$$$]/g, ""))
  }

  static validateFullName(name) {
    // Check if name contains at least 2 words and only letters/spaces
    const nameRegex = /^[a-zA-ZА-Яа-яЁё\s]{2,50}$/
    const words = name.trim().split(/\s+/)
    return nameRegex.test(name) && words.length >= 2
  }

  static validateMessageText(text) {
    if (!text || typeof text !== "string") {
      return { valid: false, error: "Matn kiritilmagan" }
    }

    const trimmedText = text.trim()

    if (trimmedText.length < 10) {
      return { valid: false, error: "Matn juda qisqa (kamida 10 ta belgi)" }
    }

    if (trimmedText.length > 1000) {
      return { valid: false, error: "Matn juda uzun (maksimal 1000 ta belgi)" }
    }

    // Check for spam patterns
    const spamPatterns = [
      /(.)\1{10,}/, // Repeated characters
      /^[A-Z\s!]{20,}$/, // All caps
      /(https?:\/\/[^\s]+)/gi, // URLs
    ]

    for (const pattern of spamPatterns) {
      if (pattern.test(trimmedText)) {
        return { valid: false, error: "Matn spam kabi ko'rinmoqda" }
      }
    }

    return { valid: true }
  }

  static sanitizeInput(input) {
    if (typeof input !== "string") return input

    // Remove potentially harmful characters
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/[<>]/g, "")
      .trim()
  }
}

module.exports = Validator
