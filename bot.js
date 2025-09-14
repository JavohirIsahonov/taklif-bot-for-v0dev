const TelegramBot = require("node-telegram-bot-api")
const APIClient = require("./api/apiClient")
const LocalStorage = require("./utils/localStorage")
const SyncManager = require("./utils/syncManager")
const ErrorHandler = require("./utils/errorHandler")
const Validator = require("./utils/validator")
const logger = require("./utils/logger")
require("dotenv").config()

const token = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(token, { polling: true })

// Initialize API client and local storage
const API_BASE_URL = process.env.API_BASE_URL || "https://usat-taklif-backend.onrender.com/api"
const apiClient = new APIClient(API_BASE_URL)
const localStorage = new LocalStorage()
const syncManager = new SyncManager(apiClient, localStorage)

let isOfflineMode = false

// User states for conversation flow
const userStates = new Map()

// State constants
const STATES = {
  IDLE: "idle",
  WAITING_LANGUAGE: "waiting_language",
  WAITING_NAME: "waiting_name",
  WAITING_PHONE: "waiting_phone",
  WAITING_COURSE: "waiting_course",
  WAITING_DIRECTION: "waiting_direction",
  WAITING_MESSAGE_TEXT: "waiting_message_text",
}

// Comprehensive translation system
const TRANSLATIONS = {
  uz: {
    // Language selection
    languageSelection: "🌍 Tilni tanlang",
    languageUzbek: "🇺🇿 O'zbek",
    languageRussian: "🇷🇺 Русский",
    
    // Welcome messages
    welcome: (name) => `👋 Xush kelibsiz, ${name}!\n\n🎓 USAT Universitet\nTaklif va shikoyatlar tizimi\n\nQuyidagilardan birini tanlang:`,
    welcomeRegistration: "Assalomu alaykum! Ro'yxatdan o'tish uchun ism familiyangizni kiriting:",
    
    // Main menu
    suggestion: "✏️ Taklif",
    complaint: "⚠️ Shikoyat",
    back: "🔙 Orqaga",
    
    // Registration flow
    enterFullName: "📝 Ism familiyangizni kiriting:",
    enterPhone: "📱 Telefon raqamingizni kiriting (+998XXXXXXX formatida):",
    selectCourse: "🎓 Kursni tanlang:",
    selectDirection: "💻 Yo'nalishni tanlang:",
    courseSelected: (course) => `✅ Kurs tanlandi: ${course}`,
    directionSelected: (direction) => `✅ Yo'nalish tanlandi: ${direction}`,
    registrationCompleting: "🎉 Ro'yxatdan o'tish yakunlanmoqda...",
    registrationComplete: "✅ Ro'yxatdan o'tish muvaffaqiyatli yakunlandi!",
    registrationCompleteOffline: "✅ Ro'yxatdan o'tish muvaffaqiyatli yakunlandi! (Offline rejim - ma'lumotlar keyinroq sinxronlanadi)",
    
    // Course options
    course1: "1-kurs",
    course2: "2-kurs", 
    course3: "3-kurs",
    course4: "4-kurs",
    
    // Direction options
    directions: {
      dasturiy_injiniring: "Dasturiy injiniring",
      kompyuter_injiniringi: "Kompyuter injiniringi",
      bank_ishi: "Bank ishi",
      moliya_texnologiyalar: "Moliya va moliyaviy texnologiyalar",
      logistika: "Logistika",
      iqtisodiyot: "Iqtisodiyot",
      buxgalteriya_hisobi: "Buxgalteriya hisobi",
      turizm_mehmondostlik: "Turizm va mehmondo'stlik",
      maktabgacha_talim: "Maktabgacha taʼlim",
      boshlangich_talim: "Boshlangʻich taʼlim",
      maxsus_pedagogika: "Maxsus pedagogika",
      ozbek_tili_adabiyoti: "O'zbek tili va adabiyoti",
      xorijiy_til_adabiyoti: "Xorijiy til va adabiyoti",
      tarix: "Tarix",
      matematika: "Matematika",
      psixologiya: "Psixologiya",
      arxitektura: "Arxitektura",
      ijtimoiy_ish: "Ijtimoiy ish"
    },
    
    // Category options
    categories: {
      sharoit: "🏢 Sharoit",
      qabul: "📝 Qabul", 
      dars: "📚 Dars jarayoni",
      teacher: "👨‍🏫 O'qituvchi",
      tutor: "🎓 Tyutor",
      dekanat: "🏛️ Dekanat",
      other: "❓ Boshqa sabab"
    },
    
    // Category descriptions
    categoryDescriptions: {
      sharoit: "Bino, xonalar, jihozlar va infratuzilma bilan bog'liq masalalar",
      qabul: "Qabul jarayoni, hujjatlar va ro'yxatga olish masalalari",
      dars: "Ta'lim sifati, dars jadvali va o'quv jarayoni",
      teacher: "Professor-o'qituvchilar bilan bog'liq masalalar",
      tutor: "Tyutorlar va ularning faoliyati haqida",
      dekanat: "Ma'muriy masalalar va dekanat xizmatlari",
      other: "Yuqoridagi kategoriyalarga kirmaydigan boshqa masalalar"
    },
    
    // Message types
    messageTypes: {
      suggestion: "taklif",
      complaint: "shikoyat"
    },
    
    // Form messages
    selectCategory: (type) => `📝 ${type} kategoriyasini tanlang:`,
    enterMessage: (type) => `📝 Endi ${type}ingizni batafsil yozing (kamida 10 ta belgi):`,
    messageTooShort: "❌ Xabar juda qisqa. Kamida 10 ta belgi kiriting:",
    messageTooLong: "❌ Xabar juda uzun. Maksimal 1000 ta belgi:",
    
    // Success messages
    messageSubmitted: (type) => `✅ ${type}ingiz muvaffaqiyatli yuborildi!\n⏰ Holat: Ko'rib chiqilmoqda\n\nJavob 24-48 soat ichida beriladi.`,
    messageSubmittedOffline: (type) => `✅ ${type}ingiz qabul qilindi! (Offline rejim)\n\n📤 Xabar keyinroq yuboriladi.`,
    
    // Error messages
    errorOccurred: "❌ Xatolik yuz berdi",
    invalidName: "❌ Ism faqat harflardan iborat bo'lishi kerak va kamida 2 ta so'zdan iborat bo'lishi kerak. Qaytadan kiriting:",
    invalidPhone: "❌ Telefon raqam noto'g'ri formatda. +998XXXXXXX formatida kiriting:",
    messageError: "❌ Xabar yuborishda xatolik yuz berdi. Qaytadan urinib ko'ring.",
    registrationError: "❌ Xatolik yuz berdi. Ro'yxatdan o'tish uchun ism familiyangizni kiriting:",
    menuError: "❌ Xatolik yuz berdi. /start buyrug'ini bosib qaytadan urinib ko'ring.",
    callbackError: "❌ Xatolik yuz berdi. /menu buyrug'ini bosib qaytadan urinib ko'ring.",
    
    // Commands
    commands: {
      start: "Botni ishga tushirish",
      help: "Yordam",
      status: "Holat",
      admin: "Admin",
      menu: "Menyu"
    },
    
    // Help text
    helpText: `🤖 Bot buyruqlari:

/start - Botni ishga tushirish
/help - Yordam
/menu - Asosiy menyu

📝 Bot orqali siz:
• Takliflaringizni yuborishingiz
• Shikoyatlaringizni bildirshingiz  
• Turli mavzular bo'yicha murojaat qilishingiz mumkin

Har bir murojaat universitet ma'muriyati tomonidan ko'rib chiqiladi.`,
    
    // Status text
    statusText: (apiStatus, userCount, messageCount, syncStatus, isOfflineMode, time) => `🔧 Bot Holati:

🌐 API Holati: ${apiStatus.isOnline ? "✅ Online" : "❌ Offline"}
📡 API URL: ${apiStatus.baseURL}
🗂️ Rejim: ${isOfflineMode ? "Offline" : "Online"}

📊 Mahalliy saqlash:
👥 Foydalanuvchilar: ${userCount}
💬 Xabarlar: ${messageCount}

🔄 Sinxronlash: ${syncStatus.isRunning ? "✅ Ishlayapti" : "❌ To'xtatilgan"}

🤖 Bot: Ishlayapti
⏰ Vaqt: ${time}`,
    
    // Admin text
    adminText: (userCount, messageCount, apiStatus, isOfflineMode, recentUsers, recentMessages) => `👨‍💼 Admin Panel:

📊 Statistika:
• Jami foydalanuvchilar: ${userCount}
• Jami xabarlar: ${messageCount}
• API holati: ${apiStatus.isOnline ? "Online" : "Offline"}
• Bot rejimi: ${isOfflineMode ? "Offline" : "Online"}

📁 So'nggi foydalanuvchilar (oxirgi 5):
${recentUsers}

💬 So'nggi xabarlar (oxirgi 3):
${recentMessages}`,
    
    // Offline messages
    offlineMode: "⚠️ Bot hozirda offline rejimda ishlayapti. Xabarlaringiz keyinroq yuboriladi.",
    offlineModeMenu: "⚠️ Bot hozirda offline rejimda ishlayapti.",
    
    // Navigation
    nextPage: "⏩ Keyingi sahifa",
    prevPage: "⏪ Oldingi sahifa",
    
    // General
    pleaseRegister: "Ro'yxatdan o'tish uchun /start buyrug'ini bosing.",
    useMenu: "Menyu uchun /start buyrug'ini bosing yoki quyidagi tugmalardan foydalaning.",
    adminOnly: "❌ Bu buyruq faqat administratorlar uchun.",
    noUsers: "Foydalanuvchilar yo'q",
    noMessages: "Xabarlar yo'q"
  },
  
  ru: {
    // Language selection
    languageSelection: "🌍 Выберите язык",
    languageUzbek: "🇺🇿 O'zbek",
    languageRussian: "🇷🇺 Русский",
    
    // Welcome messages
    welcome: (name) => `👋 Добро пожаловать, ${name}!\n\n🎓 USAT Университет\nСистема предложений и жалоб\n\nВыберите одно из:`,
    welcomeRegistration: "Здравствуйте! Для регистрации введите ваше имя и фамилию:",
    
    // Main menu
    suggestion: "✏️ Предложение",
    complaint: "⚠️ Жалоба",
    back: "🔙 Назад",
    
    // Registration flow
    enterFullName: "📝 Введите ваше имя и фамилию:",
    enterPhone: "📱 Введите номер телефона (+998XXXXXXX формат):",
    selectCourse: "🎓 Выберите курс:",
    selectDirection: "💻 Выберите направление:",
    courseSelected: (course) => `✅ Курс выбран: ${course}`,
    directionSelected: (direction) => `✅ Направление выбрано: ${direction}`,
    registrationCompleting: "🎉 Регистрация завершается...",
    registrationComplete: "✅ Регистрация успешно завершена!",
    registrationCompleteOffline: "✅ Регистрация успешно завершена! (Офлайн режим - данные будут синхронизированы позже)",
    
    // Course options
    course1: "1-курс",
    course2: "2-курс",
    course3: "3-курс", 
    course4: "4-курс",
    
    // Direction options
    directions: {
      dasturiy_injiniring: "Программная инженерия",
      kompyuter_injiniringi: "Компьютерная инженерия",
      bank_ishi: "Банковское дело",
      moliya_texnologiyalar: "Финансы и финансовые технологии",
      logistika: "Логистика",
      iqtisodiyot: "Экономика",
      buxgalteriya_hisobi: "Бухгалтерский учет",
      turizm_mehmondostlik: "Туризм и гостеприимство",
      maktabgacha_talim: "Дошкольное образование",
      boshlangich_talim: "Начальное образование",
      maxsus_pedagogika: "Специальная педагогика",
      ozbek_tili_adabiyoti: "Узбекский язык и литература",
      xorijiy_til_adabiyoti: "Иностранный язык и литература",
      tarix: "История",
      matematika: "Математика",
      psixologiya: "Психология",
      arxitektura: "Архитектура",
      ijtimoiy_ish: "Социальная работа"
    },
    
    // Category options
    categories: {
      sharoit: "🏢 Условия",
      qabul: "📝 Прием",
      dars: "📚 Учебный процесс",
      teacher: "👨‍🏫 Преподаватель",
      tutor: "🎓 Тьютор",
      dekanat: "🏛️ Деканат",
      other: "❓ Другая причина"
    },
    
    // Category descriptions
    categoryDescriptions: {
      sharoit: "Вопросы, связанные со зданиями, помещениями, оборудованием и инфраструктурой",
      qabul: "Вопросы процесса приема, документов и регистрации",
      dars: "Качество образования, расписание и учебный процесс",
      teacher: "Вопросы, связанные с профессорско-преподавательским составом",
      tutor: "О тьюторах и их деятельности",
      dekanat: "Административные вопросы и услуги деканата",
      other: "Другие вопросы, не входящие в вышеперечисленные категории"
    },
    
    // Message types
    messageTypes: {
      suggestion: "предложение",
      complaint: "жалоба"
    },
    
    // Form messages
    selectCategory: (type) => `📝 Выберите категорию ${type}:`,
    enterMessage: (type) => `📝 Теперь подробно опишите ваше ${type} (минимум 10 символов):`,
    messageTooShort: "❌ Сообщение слишком короткое. Введите минимум 10 символов:",
    messageTooLong: "❌ Сообщение слишком длинное. Максимум 1000 символов:",
    
    // Success messages
    messageSubmitted: (type) => `✅ Ваше ${type} успешно отправлено!\n⏰ Статус: На рассмотрении\n\nОтвет будет дан в течение 24-48 часов.`,
    messageSubmittedOffline: (type) => `✅ Ваше ${type} принято! (Офлайн режим)\n\n📤 Сообщение будет отправлено позже.`,
    
    // Error messages
    errorOccurred: "❌ Произошла ошибка",
    invalidName: "❌ Имя должно содержать только буквы и состоять минимум из 2 слов. Введите заново:",
    invalidPhone: "❌ Неверный формат номера телефона. Введите в формате +998XXXXXXX:",
    messageError: "❌ Ошибка при отправке сообщения. Попробуйте еще раз.",
    registrationError: "❌ Произошла ошибка. Для регистрации введите ваше имя и фамилию:",
    menuError: "❌ Произошла ошибка. Нажмите /start и попробуйте еще раз.",
    callbackError: "❌ Произошла ошибка. Нажмите /menu и попробуйте еще раз.",
    
    // Commands
    commands: {
      start: "Запустить бота",
      help: "Помощь",
      status: "Статус",
      admin: "Админ",
      menu: "Меню"
    },
    
    // Help text
    helpText: `🤖 Команды бота:

/start - Запустить бота
/help - Помощь
/menu - Главное меню

📝 Через бота вы можете:
• Отправлять предложения
• Подавать жалобы
• Обращаться по различным вопросам

Каждое обращение рассматривается администрацией университета.`,
    
    // Status text
    statusText: (apiStatus, userCount, messageCount, syncStatus, isOfflineMode, time) => `🔧 Статус бота:

🌐 Статус API: ${apiStatus.isOnline ? "✅ Online" : "❌ Offline"}
📡 API URL: ${apiStatus.baseURL}
🗂️ Режим: ${isOfflineMode ? "Offline" : "Online"}

📊 Локальное хранилище:
👥 Пользователи: ${userCount}
💬 Сообщения: ${messageCount}

🔄 Синхронизация: ${syncStatus.isRunning ? "✅ Работает" : "❌ Остановлена"}

🤖 Бот: Работает
⏰ Время: ${time}`,
    
    // Admin text
    adminText: (userCount, messageCount, apiStatus, isOfflineMode, recentUsers, recentMessages) => `👨‍💼 Админ панель:

📊 Статистика:
• Всего пользователей: ${userCount}
• Всего сообщений: ${messageCount}
• Статус API: ${apiStatus.isOnline ? "Online" : "Offline"}
• Режим бота: ${isOfflineMode ? "Offline" : "Online"}

📁 Последние пользователи (последние 5):
${recentUsers}

💬 Последние сообщения (последние 3):
${recentMessages}`,
    
    // Offline messages
    offlineMode: "⚠️ Бот сейчас работает в офлайн режиме. Ваши сообщения будут отправлены позже.",
    offlineModeMenu: "⚠️ Бот сейчас работает в офлайн режиме.",
    
    // Navigation
    nextPage: "⏩ Следующая страница",
    prevPage: "⏪ Предыдущая страница",
    
    // General
    pleaseRegister: "Нажмите /start для регистрации.",
    useMenu: "Нажмите /start для меню или используйте кнопки ниже.",
    adminOnly: "❌ Эта команда только для администраторов.",
    noUsers: "Нет пользователей",
    noMessages: "Нет сообщений"
  }
}

// Language options
const LANGUAGE_OPTIONS = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🇺🇿 O'zbek", callback_data: "lang_uz" },
        { text: "🇷🇺 Русский", callback_data: "lang_ru" },
      ],
    ],
  },
}

// Helper function to get course options based on language
function getCourseOptions(language = "uz") {
  const t = TRANSLATIONS[language]
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: t.course1, callback_data: "course_1" },
          { text: t.course2, callback_data: "course_2" },
        ],
        [
          { text: t.course3, callback_data: "course_3" },
          { text: t.course4, callback_data: "course_4" },
        ],
      ],
    },
  }
}

// Helper function to get direction options based on language and page
function getDirectionOptions(language = "uz", page = 1) {
  const t = TRANSLATIONS[language]
  const directions = t.directions
  
  switch (page) {
    case 1:
      return {
        reply_markup: {
          inline_keyboard: [
            [{ text: directions.dasturiy_injiniring, callback_data: "dir_dasturiy_injiniring" }],
            [{ text: directions.kompyuter_injiniringi, callback_data: "dir_kompyuter_injiniringi" }],
            [{ text: directions.bank_ishi, callback_data: "dir_bank_ishi" }],
            [{ text: directions.moliya_texnologiyalar, callback_data: "dir_moliya_texnologiyalar" }],
            [{ text: directions.logistika, callback_data: "dir_logistika" }],
            [{ text: directions.iqtisodiyot, callback_data: "dir_iqtisodiyot" }],
            [{ text: t.nextPage, callback_data: "dir_page_2" }],
          ],
        },
      }
    case 2:
      return {
        reply_markup: {
          inline_keyboard: [
            [{ text: directions.buxgalteriya_hisobi, callback_data: "dir_buxgalteriya_hisobi" }],
            [{ text: directions.turizm_mehmondostlik, callback_data: "dir_turizm_mehmondostlik" }],
            [{ text: directions.maktabgacha_talim, callback_data: "dir_maktabgacha_talim" }],
            [{ text: directions.boshlangich_talim, callback_data: "dir_boshlangich_talim" }],
            [{ text: directions.maxsus_pedagogika, callback_data: "dir_maxsus_pedagogika" }],
            [{ text: directions.ozbek_tili_adabiyoti, callback_data: "dir_ozbek_tili_adabiyoti" }],
            [
              { text: t.prevPage, callback_data: "dir_page_1" },
              { text: t.nextPage, callback_data: "dir_page_3" },
            ],
          ],
        },
      }
    case 3:
      return {
        reply_markup: {
          inline_keyboard: [
            [{ text: directions.xorijiy_til_adabiyoti, callback_data: "dir_xorijiy_til_adabiyoti" }],
            [{ text: directions.tarix, callback_data: "dir_tarix" }],
            [{ text: directions.matematika, callback_data: "dir_matematika" }],
            [{ text: directions.psixologiya, callback_data: "dir_psixologiya" }],
            [{ text: directions.arxitektura, callback_data: "dir_arxitektura" }],
            [{ text: directions.ijtimoiy_ish, callback_data: "dir_ijtimoiy_ish" }],
            [{ text: t.prevPage, callback_data: "dir_page_2" }],
          ],
        },
      }
    default:
      return getDirectionOptions(language, 1)
  }
}

// Helper function to get category options based on language
function getCategoryOptions(language = "uz") {
  const t = TRANSLATIONS[language]
  const categories = t.categories
  
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: categories.sharoit, callback_data: "cat_sharoit" }],
        [{ text: categories.qabul, callback_data: "cat_qabul" }],
        [{ text: categories.dars, callback_data: "cat_dars" }],
        [{ text: categories.teacher, callback_data: "cat_teacher" }],
        [{ text: categories.tutor, callback_data: "cat_tutor" }],
        [{ text: categories.dekanat, callback_data: "cat_dekanat" }],
        [{ text: categories.other, callback_data: "cat_other" }],
      ],
    },
  }
}

// Show language selection
function showLanguageSelection(chatId) {
  const message = `🌍 Tilni tanlang / Выберите язык

🇺🇿 O'zbek
🇷🇺 Русский`

  bot.sendMessage(chatId, message, LANGUAGE_OPTIONS)
  userStates.set(chatId, { state: STATES.WAITING_LANGUAGE })
}

function showMainMenu(chatId, fullName, language = "uz") {
  const t = TRANSLATIONS[language] || TRANSLATIONS.uz
  
  const enhancedMainMenu = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: t.suggestion, callback_data: "suggestion" },
          { text: t.complaint, callback_data: "complaint" },
        ],
      ],
    },
  }
  bot.sendMessage(chatId, t.welcome(fullName), enhancedMainMenu)
}

function getCategoryDescription(category, language = "uz") {
  const t = TRANSLATIONS[language] || TRANSLATIONS.uz
  const descriptions = t.categoryDescriptions
  
  // Map category names to translation keys
  const categoryMap = {
    "Sharoit": "sharoit",
    "Qabul": "qabul", 
    "Dars jarayoni": "dars",
    "O'qituvchi": "teacher",
    "Tyutor": "tutor",
    "Dekanat": "dekanat",
    "Boshqa sabab": "other",
    // Russian mappings
    "Условия": "sharoit",
    "Прием": "qabul",
    "Учебный процесс": "dars", 
    "Преподаватель": "teacher",
    "Тьютор": "tutor",
    "Деканат": "dekanat",
    "Другая причина": "other"
  }
  
  const key = categoryMap[category]
  return key ? descriptions[key] : ""
}

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id
  logger.info("Start command received", { chatId, username: msg.from?.username })

  try {
    let existingUser = null

    // Try API first
    try {
      existingUser = await ErrorHandler.retryOperation(() => apiClient.checkUserExists(chatId), 2, 1000)
      isOfflineMode = false
    } catch (apiError) {
      logger.warn("API unavailable, checking local storage", { error: apiError.message })
      existingUser = localStorage.findUser(chatId)
      isOfflineMode = true
    }

    if (existingUser) {
      logger.info("Existing user found", { fullName: existingUser.fullName, chatId, language: existingUser.language })

      // Update user activity
      if (!isOfflineMode) {
        apiClient.updateUserActivity(chatId)
      } else {
        localStorage.updateUserActivity(chatId)
      }

      // User exists, show main menu with their language
      const userLanguage = existingUser.language || "uz"
      showMainMenu(chatId, existingUser.fullName, userLanguage)
      userStates.set(chatId, { state: STATES.IDLE, fullName: existingUser.fullName, language: userLanguage })

      if (isOfflineMode) {
        const t = TRANSLATIONS[userLanguage] || TRANSLATIONS.uz
        bot.sendMessage(chatId, t.offlineMode)
      }
    } else {
      logger.info("New user registration started", { chatId })

      // User doesn't exist, start with language selection
      showLanguageSelection(chatId)
    }
  } catch (error) {
    logger.error("Start command error", { error: error.message, chatId })

    const t = TRANSLATIONS.uz // Default to Uzbek for error messages
    bot.sendMessage(chatId, t.registrationError)
    userStates.set(chatId, { state: STATES.WAITING_NAME })
  }
})

// Help command handler
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id
  
  // Try to get user's language preference
  let userLanguage = "uz"
  try {
    const existingUser = localStorage.findUser(chatId) || (await apiClient.checkUserExists(chatId).catch(() => null))
    if (existingUser && existingUser.language) {
      userLanguage = existingUser.language
    }
  } catch (error) {
    // Default to Uzbek if can't determine language
  }
  
  const t = TRANSLATIONS[userLanguage] || TRANSLATIONS.uz
  bot.sendMessage(chatId, t.helpText)
})

bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id

  // Try to get user's language preference
  let userLanguage = "uz"
  try {
    const existingUser = localStorage.findUser(chatId) || (await apiClient.checkUserExists(chatId).catch(() => null))
    if (existingUser && existingUser.language) {
      userLanguage = existingUser.language
    }
  } catch (error) {
    // Default to Uzbek if can't determine language
  }

  const apiStatus = apiClient.getStatus()
  const userCount = localStorage.readUsers().length
  const messageCount = localStorage.readMessages().length
  const syncStatus = syncManager.getStatus()
  const time = new Date().toLocaleString(userLanguage === "ru" ? "ru-RU" : "uz-UZ")

  const t = TRANSLATIONS[userLanguage] || TRANSLATIONS.uz
  const statusText = t.statusText(apiStatus, userCount, messageCount, syncStatus, isOfflineMode, time)

  bot.sendMessage(chatId, statusText)
})

bot.onText(/\/admin/, async (msg) => {
  const chatId = msg.chat.id

  // Try to get user's language preference
  let userLanguage = "uz"
  try {
    const existingUser = localStorage.findUser(chatId) || (await apiClient.checkUserExists(chatId).catch(() => null))
    if (existingUser && existingUser.language) {
      userLanguage = existingUser.language
    }
  } catch (error) {
    // Default to Uzbek if can't determine language
  }

  const t = TRANSLATIONS[userLanguage] || TRANSLATIONS.uz

  // You can add your admin chat ID here
  const adminChatIds = [chatId] // For now, allow the current user

  if (!adminChatIds.includes(chatId)) {
    bot.sendMessage(chatId, t.adminOnly)
    return
  }

  const users = localStorage.readUsers()
  const messages = localStorage.readMessages()
  const apiStatus = apiClient.getStatus()

  const recentUsers = users
    .slice(-5)
    .map((user) => `• ${user.fullName} (${user.course})`)
    .join("\n") || t.noUsers

  const recentMessages = messages
    .slice(-3)
    .map((msg) => `• ${msg.ticketType}: ${msg.text.substring(0, 50)}...`)
    .join("\n") || t.noMessages

  const adminText = t.adminText(users.length, messages.length, apiStatus, isOfflineMode, recentUsers, recentMessages)

  bot.sendMessage(chatId, adminText)
})

bot.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id

  try {
    let existingUser = null

    // Try API first, then local storage
    try {
      existingUser = await ErrorHandler.retryOperation(() => apiClient.checkUserExists(chatId), 2, 1000)
      isOfflineMode = false
    } catch (apiError) {
      logger.warn("API unavailable for menu command", { error: apiError.message })
      existingUser = localStorage.findUser(chatId)
      isOfflineMode = true
    }

    if (existingUser) {
      const userLanguage = existingUser.language || "uz"
      showMainMenu(chatId, existingUser.fullName, userLanguage)
      userStates.set(chatId, { state: STATES.IDLE, fullName: existingUser.fullName, language: userLanguage })

      if (isOfflineMode) {
        const t = TRANSLATIONS[userLanguage] || TRANSLATIONS.uz
        bot.sendMessage(chatId, t.offlineModeMenu)
      }
    } else {
      const t = TRANSLATIONS.uz // Default to Uzbek for new users
      bot.sendMessage(chatId, t.pleaseRegister)
    }
  } catch (error) {
    logger.error("Menu command error", { error: error.message, chatId })
    const t = TRANSLATIONS.uz // Default to Uzbek for error messages
    bot.sendMessage(chatId, t.menuError)
  }
})

// Handle text messages for registration flow
bot.on("message", async (msg) => {
  const chatId = msg.chat.id
  const text = msg.text

  // Skip if it's a command
  if (text && text.startsWith("/")) {
    return
  }

  const userState = userStates.get(chatId)
  if (!userState) {
    return
  }

  logger.info(`Processing message in state: ${userState.state}`, { chatId, text: text?.substring(0, 50) })

  try {
    switch (userState.state) {
      case STATES.WAITING_NAME:
        const nameLanguage = userState.language || "uz"
        const nameT = TRANSLATIONS[nameLanguage] || TRANSLATIONS.uz
        
        if (!text || text.trim().length < 2) {
          bot.sendMessage(chatId, nameT.enterFullName)
          return
        }

        if (!Validator.validateFullName(text)) {
          bot.sendMessage(chatId, nameT.invalidName)
          return
        }

        userState.fullName = text.trim()
        userState.state = STATES.WAITING_PHONE

        bot.sendMessage(chatId, nameT.enterPhone)
        userStates.set(chatId, userState)
        break

      case STATES.WAITING_PHONE:
        const phoneLanguage = userState.language || "uz"
        const phoneT = TRANSLATIONS[phoneLanguage] || TRANSLATIONS.uz
        
        if (!Validator.validatePhoneNumber(text)) {
          bot.sendMessage(chatId, phoneT.invalidPhone)
          return
        }

        userState.phone = text.trim()
        userState.state = STATES.WAITING_COURSE

        bot.sendMessage(chatId, phoneT.selectCourse, getCourseOptions(phoneLanguage))
        userStates.set(chatId, userState)
        break

      case STATES.WAITING_MESSAGE_TEXT:
        const messageLanguage = userState.language || "uz"
        const messageT = TRANSLATIONS[messageLanguage] || TRANSLATIONS.uz

        if (!text || text.trim().length < 10) {
          bot.sendMessage(chatId, messageT.messageTooShort)
          return
        }

        if (text.length > 1000) {
          bot.sendMessage(chatId, messageT.messageTooLong)
          return
        }

        await handleMessageSubmission(chatId, userState, text.trim())
        break

      default:
        const existingUser =
          localStorage.findUser(chatId) || (await apiClient.checkUserExists(chatId).catch(() => null))
        if (existingUser) {
          const userLanguage = existingUser.language || "uz"
          const t = TRANSLATIONS[userLanguage] || TRANSLATIONS.uz
          bot.sendMessage(chatId, t.useMenu)
          showMainMenu(chatId, existingUser.fullName, userLanguage)
        } else {
          const t = TRANSLATIONS.uz // Default to Uzbek for new users
          bot.sendMessage(chatId, t.pleaseRegister)
        }
        break
    }
  } catch (error) {
    logger.error("Message handling error", { error: error.message, chatId, state: userState.state })
    const t = TRANSLATIONS.uz // Default to Uzbek for error messages
    bot.sendMessage(chatId, t.menuError)
    userStates.delete(chatId)
  }
})

// Handle callback queries (inline button presses)
bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id
  const data = callbackQuery.data
  const messageId = callbackQuery.message.message_id

  logger.info("Callback query received", { chatId, data })

  // Answer the callback query to remove loading state
  bot.answerCallbackQuery(callbackQuery.id)

  const userState = userStates.get(chatId) || { state: STATES.IDLE }

  try {
    // Handle language selection
    if (data.startsWith("lang_")) {
      const language = data.replace("lang_", "")
      userState.language = language
      userState.state = STATES.WAITING_NAME

      const t = TRANSLATIONS[language] || TRANSLATIONS.uz
      const welcomeMessage = t.welcomeRegistration

      bot.editMessageText(welcomeMessage, {
        chat_id: chatId,
        message_id: messageId,
      })

      userStates.set(chatId, userState)
      return
    }

    // Handle course selection
    if (data.startsWith("course_")) {
      const courseNumber = data.replace("course_", "")
      const language = userState.language || "uz"
      const t = TRANSLATIONS[language] || TRANSLATIONS.uz
      
      const course = courseNumber === "1" ? t.course1 : 
                    courseNumber === "2" ? t.course2 :
                    courseNumber === "3" ? t.course3 : t.course4
      
      userState.course = course
      userState.state = STATES.WAITING_DIRECTION

      bot.editMessageText(`${t.courseSelected(course)}\n\n${t.selectDirection}`, {
        chat_id: chatId,
        message_id: messageId,
        ...getDirectionOptions(language, 1),
      })

      userStates.set(chatId, userState)
      return
    }

    if (data.startsWith("dir_page_")) {
      const pageNumber = parseInt(data.replace("dir_page_", ""))
      const language = userState.language || "uz"
      const t = TRANSLATIONS[language] || TRANSLATIONS.uz
      const pageText = t.selectDirection

      bot.editMessageText(pageText, {
        chat_id: chatId,
        message_id: messageId,
        ...getDirectionOptions(language, pageNumber),
      })
      return
    }

    if (data.startsWith("dir_") && !data.startsWith("dir_page_")) {
      const language = userState.language || "uz"
      const t = TRANSLATIONS[language] || TRANSLATIONS.uz
      const directions = t.directions
      
      const directionMap = {
        dir_dasturiy_injiniring: directions.dasturiy_injiniring,
        dir_kompyuter_injiniringi: directions.kompyuter_injiniringi,
        dir_bank_ishi: directions.bank_ishi,
        dir_moliya_texnologiyalar: directions.moliya_texnologiyalar,
        dir_logistika: directions.logistika,
        dir_iqtisodiyot: directions.iqtisodiyot,
        dir_buxgalteriya_hisobi: directions.buxgalteriya_hisobi,
        dir_turizm_mehmondostlik: directions.turizm_mehmondostlik,
        dir_maktabgacha_talim: directions.maktabgacha_talim,
        dir_boshlangich_talim: directions.boshlangich_talim,
        dir_maxsus_pedagogika: directions.maxsus_pedagogika,
        dir_ozbek_tili_adabiyoti: directions.ozbek_tili_adabiyoti,
        dir_xorijiy_til_adabiyoti: directions.xorijiy_til_adabiyoti,
        dir_tarix: directions.tarix,
        dir_matematika: directions.matematika,
        dir_psixologiya: directions.psixologiya,
        dir_arxitektura: directions.arxitektura,
        dir_ijtimoiy_ish: directions.ijtimoiy_ish,
      }

      const direction = directionMap[data]
      if (direction) {
        userState.direction = direction

        bot.editMessageText(`${t.directionSelected(direction)}\n\n${t.registrationCompleting}`, {
          chat_id: chatId,
          message_id: messageId,
        })

        userStates.set(chatId, userState)

        // Wait a bit then complete registration and delete the message
        setTimeout(async () => {
          await completeRegistration(chatId, userState)
          // Delete the "yakunlanmoqda" message
          bot.deleteMessage(chatId, messageId).catch(() => {})
        }, 2000)
        return
      }
    }

    // Handle main menu actions
    if (data === "suggestion") {
      userState.ticketType = data // suggestion
      userState.state = STATES.WAITING_MESSAGE_TEXT
      userState.category = null // No category for suggestions
      userState.substatus = null // No substatus for suggestions

      const language = userState.language || "uz"
      const t = TRANSLATIONS[language] || TRANSLATIONS.uz
      const translatedType = t.messageTypes[userState.ticketType] || userState.ticketType
      const messageText = t.enterMessage(translatedType)

      bot.editMessageText(messageText, {
        chat_id: chatId,
        message_id: messageId,
      })

      userStates.set(chatId, userState)
      return
    }

    if (data === "complaint") {
      userState.ticketType = data // complaint
      userState.state = STATES.WAITING_MESSAGE_TEXT

      const language = userState.language || "uz"
      const t = TRANSLATIONS[language] || TRANSLATIONS.uz
      const translatedType = t.messageTypes[userState.ticketType] || userState.ticketType
      const categoryText = t.selectCategory(translatedType)

      bot.editMessageText(categoryText, {
        chat_id: chatId,
        message_id: messageId,
        ...getCategoryOptions(language),
      })

      userStates.set(chatId, userState)
      return
    }

    // Handle category selection
    if (data.startsWith("cat_")) {
      const language = userState.language || "uz"
      const t = TRANSLATIONS[language] || TRANSLATIONS.uz
      const categories = t.categories
      
      const categoryMap = {
        cat_sharoit: { uz: "Sharoit", ru: "Условия", en: "Conditions" },
        cat_qabul: { uz: "Qabul", ru: "Прием", en: "Admission" },
        cat_dars: { uz: "Dars jarayoni", ru: "Учебный процесс", en: "Learning Process" },
        cat_teacher: { uz: "O'qituvchi", ru: "Преподаватель", en: "Teacher" },
        cat_tutor: { uz: "Tyutor", ru: "Тьютор", en: "Tutor" },
        cat_dekanat: { uz: "Dekanat", ru: "Деканат", en: "Dean Office" },
        cat_other: { uz: "Boshqa sabab", ru: "Другая причина", en: "Other" },
      }

      const categoryData = categoryMap[data]
      const category = language === "ru" ? categoryData.ru : categoryData.uz
      const substatus = categoryData.en
      const description = getCategoryDescription(category, language)

      userState.category = category
      userState.substatus = substatus

      const translatedType = t.messageTypes[userState.ticketType] || userState.ticketType
      const messageText = t.enterMessage(translatedType)

      bot.editMessageText(
        `✅ Kategoriya: ${category}\n${description}\n\n${messageText}`,
        {
          chat_id: chatId,
          message_id: messageId,
        },
      )

      userStates.set(chatId, userState)
      return
    }

    // Handle help info
    if (data === "help_info") {
      const language = userState.language || "uz"
      const t = TRANSLATIONS[language] || TRANSLATIONS.uz
      const helpText = `${t.help}\n\n${t.helpText}\n\n🔄 ${t.useMenu}`

      bot.editMessageText(helpText, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [[{ text: t.back, callback_data: "back_to_menu" }]],
        },
      })
      return
    }

    // Handle back to menu
    if (data === "back_to_menu") {
      const existingUser = localStorage.findUser(chatId) || (await apiClient.checkUserExists(chatId).catch(() => null))
      if (existingUser) {
        const userLanguage = existingUser.language || "uz"
        const t = TRANSLATIONS[userLanguage] || TRANSLATIONS.uz
        const welcomeText = t.welcome(existingUser.fullName)

        bot.editMessageText(welcomeText, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [
                { text: t.suggestion, callback_data: "suggestion" },
                { text: t.complaint, callback_data: "complaint" },
              ],
            ],
          },
        })

        userStates.set(chatId, { state: STATES.IDLE, fullName: existingUser.fullName, language: userLanguage })
      }
      return
    }
  } catch (error) {
    logger.error("Callback query error", { error: error.message, chatId, data })
    const t = TRANSLATIONS.uz // Default to Uzbek for error messages
    bot.sendMessage(chatId, t.callbackError)
  }
})

async function handleMessageSubmission(chatId, userState, messageText) {
  try {
    const ticketNumber = `USAT-${Date.now().toString().slice(-6)}`

    const priority = determinePriority(userState.category, messageText)
    const messageId = Date.now() // Generate unique messageId

    const messageData = {
      messageId: messageId,
      userId: chatId, // Add userId field (same as chatId for consistency)
      chatId: chatId,
      timestamp: new Date().toISOString(),
      status: "pending",
      ticketType: userState.ticketType, // suggestion or complaint (English for API)
      text: messageText,
      language: userState.language || "uz",
      isactive: false,
      substatus: userState.ticketType === "suggestion" ? null : userState.substatus, // null for suggestions, category for complaints
    }

    // Console'da API'ga jo'natilayotgan datani ko'rsatish
    console.log("=== TAKLIF/SHIKOYAT API'GA JO'NATILAYOTGAN DATA ===")
    console.log("Ticket Type:", userState.ticketType)
    console.log("Full Data:", JSON.stringify(messageData, null, 2))
    console.log("================================================")

    let result = null

    // Faqat API'ga jo'natish
    try {
      result = await ErrorHandler.retryOperation(() => apiClient.saveMessage(messageData), 2, 2000)
      console.log("✅ API'ga muvaffaqiyatli jo'natildi!")
    } catch (apiError) {
      console.log("❌ API'ga jo'natishda xatolik:", apiError.message)
      logger.error("API message submission failed", { error: apiError.message })
    }

    if (result) {
      const language = userState.language || "uz"
      const t = TRANSLATIONS[language] || TRANSLATIONS.uz
      const translatedType = t.messageTypes[userState.ticketType] || userState.ticketType

      const statusMessage = t.messageSubmitted(translatedType)
      bot.sendMessage(chatId, statusMessage)

      // Return to main menu
      setTimeout(() => {
        showMainMenu(chatId, userState.fullName, userState.language)
        userStates.set(chatId, { state: STATES.IDLE, fullName: userState.fullName, language: userState.language })
      }, 2000)
    } else {
      const language = userState.language || "uz"
      const t = TRANSLATIONS[language] || TRANSLATIONS.uz
      bot.sendMessage(chatId, t.messageError)
    }
  } catch (error) {
    logger.error("Message submission error", { error: error.message, chatId })
    const t = TRANSLATIONS.uz // Default to Uzbek for error messages
    bot.sendMessage(chatId, t.messageError)
  }
}

function determinePriority(category, messageText) {
  const highPriorityKeywords = ["shoshilinch", "muhim", "zudlik", "tezkor"]
  const highPriorityCategories = ["Dekanat", "O'qituvchi"]

  const text = messageText.toLowerCase()
  const hasHighPriorityKeyword = highPriorityKeywords.some((keyword) => text.includes(keyword))
  const isHighPriorityCategory = highPriorityCategories.includes(category)

  if (hasHighPriorityKeyword || isHighPriorityCategory) {
    return "Yuqori"
  } else if (text.length > 200) {
    return "O'rta"
  } else {
    return "Past"
  }
}

async function completeRegistration(chatId, userState) {
  const userData = {
    userId: chatId, // Use chatId as userId for consistency
    chatId: chatId,
    fullName: userState.fullName,
    phone: userState.phone,
    course: userState.course,
    direction: userState.direction,
    language: userState.language || "uz",
    lastActivity: new Date().toISOString(),
    synced: false, // Add sync flag
  }

  console.log("[v0] User registration data being sent to API:", JSON.stringify(userData, null, 2))

  try {
    let result = null

    // Try API first
    if (!isOfflineMode) {
      try {
        console.log("[v0] Attempting API registration call...")
        result = await ErrorHandler.retryOperation(() => apiClient.registerUser(userData), 2, 2000)
        userData.synced = true // Mark as synced if API call succeeds
        console.log("[v0] API registration successful:", result)
      } catch (apiError) {
        console.log("[v0] API registration failed:", apiError.message)
        logger.warn("API registration failed, saving locally", { error: apiError.message })
        isOfflineMode = true
      }
    }

    // Fallback to local storage
    if (isOfflineMode || !result) {
      result = localStorage.saveUser(userData)
      logger.info("User saved to local storage", { fullName: userData.fullName })
    }

    if (result) {
      const language = userState.language || "uz"
      const t = TRANSLATIONS[language] || TRANSLATIONS.uz
      const successMessage = isOfflineMode
        ? t.registrationCompleteOffline
        : t.registrationComplete

      bot.sendMessage(chatId, successMessage)
      showMainMenu(chatId, userState.fullName, language)
      userStates.set(chatId, { state: STATES.IDLE, fullName: userState.fullName, language: language })
    }
  } catch (error) {
    logger.error("Registration error", { error: error.message, chatId })
    const errorInfo = ErrorHandler.handleAPIError(error, "User registration")
    const t = TRANSLATIONS.uz // Default to Uzbek for error messages
    bot.sendMessage(chatId, `${t.errorOccurred} ${errorInfo.userMessage}`)

    if (errorInfo.errorType !== "DUPLICATE") {
      bot.sendMessage(chatId, t.pleaseRegister)
      userStates.delete(chatId)
    }
  }
}

// Error handling for bot polling
bot.on("polling_error", (error) => {
  logger.error("Polling error", { error: error.message })
})

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Received SIGINT, shutting down gracefully...")
  syncManager.stop()
  process.exit(0)
})

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, shutting down gracefully...")
  syncManager.stop()
  process.exit(0)
})

// Initialize bot
async function initializeBot() {
  logger.info("Initializing bot...")
  logger.info(`API Base URL: ${API_BASE_URL}`)
  logger.info(`Bot Token: ${token ? "Set" : "Missing"}`)

  // Initialize local storage
  logger.info("📁 Local storage initialized")

  const isHealthy = await apiClient.healthCheck()
  if (!isHealthy) {
    logger.warn("⚠️ API health check failed - bot will run in offline mode")
    logger.warn("Please check if the API server is running and accessible")
    isOfflineMode = true
  } else {
    logger.info("✅ API health check passed - online mode")
    isOfflineMode = false

    // Start sync manager if API is available
    syncManager.start(5) // Sync every 5 minutes
  }

  logger.info("🤖 Bot started successfully!")
  logger.info(`Mode: ${isOfflineMode ? "Offline" : "Online"}`)
}

initializeBot()