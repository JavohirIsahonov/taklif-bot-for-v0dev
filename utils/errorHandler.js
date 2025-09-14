class ErrorHandler {
  static handleAPIError(error, context = "") {
    const timestamp = new Date().toISOString()
    console.error(`[ERROR] ${timestamp} - ${context}:`, error.message)

    // Categorize errors
    if (error.message.includes("timeout")) {
      return {
        userMessage: "Serverga ulanishda muammo. Iltimos, biroz kuting va qaytadan urinib ko'ring.",
        shouldRetry: true,
        errorType: "TIMEOUT",
      }
    }

    if (error.message.includes("Network Error") || error.code === "ENOTFOUND") {
      return {
        userMessage: "Internet aloqasi bilan muammo. Iltimos, internetingizni tekshiring.",
        shouldRetry: true,
        errorType: "NETWORK",
      }
    }

    if (error.message.includes("already exists")) {
      return {
        userMessage: "Bu foydalanuvchi allaqachon ro'yxatdan o'tgan.",
        shouldRetry: false,
        errorType: "DUPLICATE",
      }
    }

    if (error.message.includes("Invalid") || error.message.includes("Missing")) {
      return {
        userMessage: "Ma'lumotlarda xatolik. Iltimos, to'g'ri ma'lumot kiriting.",
        shouldRetry: false,
        errorType: "VALIDATION",
      }
    }

    // Default error
    return {
      userMessage: "Kutilmagan xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
      shouldRetry: true,
      errorType: "UNKNOWN",
    }
  }

  static async retryOperation(operation, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        console.log(`[RETRY] Attempt ${attempt}/${maxRetries} failed:`, error.message)

        if (attempt === maxRetries) {
          throw error
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay * attempt))
      }
    }
  }
}

module.exports = ErrorHandler
