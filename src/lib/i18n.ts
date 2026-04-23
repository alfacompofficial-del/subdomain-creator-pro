export type Language = "ru" | "en" | "uz";

const translations: Record<string, Record<Language, string>> = {
  // Settings page
  "settings.title": { ru: "Настройки", en: "Settings", uz: "Sozlamalar" },
  "settings.subtitle": { ru: "Оформите рабочее место и управляйте своим аккаунтом.", en: "Customize your workspace and manage your account.", uz: "Ish joyingizni sozlang va hisobingizni boshqaring." },
  "settings.tab.profile": { ru: "Профиль", en: "Profile", uz: "Profil" },
  "settings.tab.appearance": { ru: "Внешний вид", en: "Appearance", uz: "Tashqi ko'rinish" },
  "settings.tab.lessons": { ru: "Уроки", en: "Lessons", uz: "Darslar" },
  "settings.tab.account": { ru: "Аккаунт", en: "Account", uz: "Hisob" },

  // Profile
  "profile.title": { ru: "Личная информация", en: "Personal information", uz: "Shaxsiy ma'lumotlar" },
  "profile.subtitle": { ru: "Эти данные будут видны другим участникам в лобби.", en: "This data will be visible to other lobby members.", uz: "Bu ma'lumotlar lobbidagi boshqa ishtirokchilarga ko'rinadi." },
  "profile.displayName": { ru: "Отображаемое имя", en: "Display name", uz: "Ko'rsatiladigan ism" },
  "profile.displayNamePlaceholder": { ru: "Как вас называть?", en: "What should we call you?", uz: "Sizni qanday chaqiraylik?" },
  "profile.bio": { ru: "О себе", en: "About", uz: "O'zingiz haqida" },
  "profile.bioPlaceholder": { ru: "Краткая информация о вас...", en: "Brief information about you...", uz: "O'zingiz haqida qisqacha ma'lumot..." },
  "profile.save": { ru: "Сохранить профиль", en: "Save profile", uz: "Profilni saqlash" },
  "profile.saving": { ru: "Сохранение...", en: "Saving...", uz: "Saqlanmoqda..." },
  "profile.saved": { ru: "Профиль успешно обновлен!", en: "Profile updated successfully!", uz: "Profil muvaffaqiyatli yangilandi!" },
  "profile.error": { ru: "Ошибка сохранения профиля", en: "Error saving profile", uz: "Profilni saqlashda xatolik" },

  // Appearance
  "appearance.title": { ru: "Оформление", en: "Appearance", uz: "Tashqi ko'rinish" },
  "appearance.subtitle": { ru: "Настройте цветовую схему сайта и тему.", en: "Customize the site color scheme and theme.", uz: "Sayt rang sxemasi va mavzusini sozlang." },
  "appearance.theme": { ru: "Цветовая тема", en: "Color theme", uz: "Rang mavzusi" },
  "appearance.light": { ru: "Светлая", en: "Light", uz: "Yorug'" },
  "appearance.dark": { ru: "Темная", en: "Dark", uz: "Qorong'u" },
  "appearance.system": { ru: "Системная", en: "System", uz: "Tizim" },
  "appearance.accent": { ru: "Акцентный цвет", en: "Accent color", uz: "Urg'u rangi" },

  // Editor settings
  "editor.title": { ru: "Редактор кода", en: "Code Editor", uz: "Kod muharriri" },
  "editor.subtitle": { ru: "Настройки поведения редактора.", en: "Editor behavior settings.", uz: "Muharrir xatti-harakatlar sozlamalari." },
  "editor.ctrlSlash": { ru: "Ctrl+/ — комментирование через #", en: "Ctrl+/ — comment with #", uz: "Ctrl+/ — # bilan izoh qo'shish" },
  "editor.ctrlSlashDesc": { ru: "При нажатии Ctrl+/ добавляет # в начало строки (Python стиль)", en: "When pressing Ctrl+/, adds # at the beginning of the line (Python style)", uz: "Ctrl+/ bosilganda qator boshiga # qo'shadi (Python uslubi)" },

  // Language
  "language.title": { ru: "Язык интерфейса", en: "Interface language", uz: "Interfeys tili" },
  "language.subtitle": { ru: "Выберите язык для всех элементов интерфейса.", en: "Choose a language for all interface elements.", uz: "Barcha interfeys elementlari uchun tilni tanlang." },

  // Lessons
  "lessons.join.title": { ru: "Присоединиться к уроку", en: "Join a lesson", uz: "Darsga qo'shilish" },
  "lessons.join.subtitle": { ru: "Введите код, предоставленный учителем, чтобы войти в лобби.", en: "Enter the code provided by the teacher to join the lobby.", uz: "Lobbiga kirish uchun o'qituvchi bergan kodni kiriting." },
  "lessons.join.placeholder": { ru: "НАПРИМЕР: ABC-123", en: "E.G.: ABC-123", uz: "MASALAN: ABC-123" },
  "lessons.join.button": { ru: "Войти", en: "Join", uz: "Kirish" },
  "lessons.join.joining": { ru: "Вход...", en: "Joining...", uz: "Kirish..." },
  "lessons.join.notFound": { ru: "Лобби не найдено или завершено", en: "Lobby not found or finished", uz: "Lobbi topilmadi yoki yakunlangan" },
  "lessons.join.error": { ru: "Ошибка подключения: ", en: "Connection error: ", uz: "Ulanish xatosi: " },
  "lessons.join.success": { ru: "Вы подключились к лобби!", en: "You joined the lobby!", uz: "Siz lobbiga qo'shildingiz!" },
  "lessons.join.enterCode": { ru: "Введите код лобби", en: "Enter lobby code", uz: "Lobbi kodini kiriting" },

  // Homework
  "homework.title": { ru: "Домашние задания", en: "Homework", uz: "Uy vazifasi" },
  "homework.subtitle.teacher": { ru: "Управление домашними заданиями для учеников.", en: "Manage homework for students.", uz: "O'quvchilar uchun uy vazifalarini boshqarish." },
  "homework.subtitle.student": { ru: "Список домашних заданий от преподавателей.", en: "Homework list from teachers.", uz: "O'qituvchilardan uy vazifalari ro'yxati." },
  "homework.new": { ru: "Новое задание", en: "New assignment", uz: "Yangi topshiriq" },
  "homework.editing": { ru: "Редактирование задания", en: "Editing assignment", uz: "Topshiriqni tahrirlash" },
  "homework.titleLabel": { ru: "Заголовок (например: Практика Python)", en: "Title (e.g.: Python Practice)", uz: "Sarlavha (masalan: Python Amaliyoti)" },
  "homework.titlePlaceholder": { ru: "Тема задания", en: "Assignment topic", uz: "Topshiriq mavzusi" },
  "homework.descLabel": { ru: "Описание задачи", en: "Task description", uz: "Vazifa tavsifi" },
  "homework.descPlaceholder": { ru: "Опишите, что нужно сделать ученикам...", en: "Describe what students need to do...", uz: "O'quvchilar nima qilishi kerakligini tasvirlang..." },
  "homework.cancel": { ru: "Отмена", en: "Cancel", uz: "Bekor qilish" },
  "homework.saveChanges": { ru: "Сохранить изменения", en: "Save changes", uz: "O'zgarishlarni saqlash" },
  "homework.add": { ru: "Добавить задание", en: "Add assignment", uz: "Topshiriq qo'shish" },
  "homework.empty": { ru: "Пока нет активных домашних заданий", en: "No active homework yet", uz: "Hozircha faol uy vazifalari yo'q" },
  "homework.added": { ru: "Домашнее задание добавлено", en: "Homework added", uz: "Uy vazifasi qo'shildi" },
  "homework.updated": { ru: "Домашнее задание обновлено", en: "Homework updated", uz: "Uy vazifasi yangilandi" },
  "homework.deleted": { ru: "Домашнее задание удалено", en: "Homework deleted", uz: "Uy vazifasi o'chirildi" },
  "homework.fillFields": { ru: "Пожалуйста, заполните заголовок и описание домашнего задания", en: "Please fill in the title and description", uz: "Iltimos, sarlavha va tavsifni to'ldiring" },
  "homework.addedDate": { ru: "Добавлено: ", en: "Added: ", uz: "Qo'shildi: " },

  // Teacher settings
  "teacher.title": { ru: "Параметры уроков", en: "Lesson settings", uz: "Dars sozlamalari" },
  "teacher.subtitle": { ru: "Настройки для учителей по умолчанию.", en: "Default teacher settings.", uz: "Standart o'qituvchi sozlamalari." },
  "teacher.defaultLang": { ru: "Язык новых лобби по умолчанию", en: "Default language for new lobbies", uz: "Yangi lobbilar uchun standart til" },
  "teacher.hint": { ru: "Эти настройки помогут вам быстрее создавать учебные сессии.", en: "These settings will help you create study sessions faster.", uz: "Bu sozlamalar o'quv sessiyalarini tezroq yaratishga yordam beradi." },

  // Account
  "account.title": { ru: "Безопасность аккаунта", en: "Account security", uz: "Hisob xavfsizligi" },
  "account.email": { ru: "Электронная почта", en: "Email", uz: "Elektron pochta" },
  "account.emailHint": { ru: "Почту можно будет сменить в будущих обновлениях.", en: "Email change will be available in future updates.", uz: "Elektron pochtani kelajakdagi yangilanishlarda o'zgartirish mumkin bo'ladi." },
  "account.signOut": { ru: "Выйти из аккаунта", en: "Sign out", uz: "Hisobdan chiqish" },

  // Header
  "header.dashboard": { ru: "Мои сайты", en: "My Sites", uz: "Saytlarim" },
  "header.editor": { ru: "Редактор", en: "Editor", uz: "Muharrir" },
  "header.settings": { ru: "Настройки", en: "Settings", uz: "Sozlamalar" },
  "header.admin": { ru: "Админ", en: "Admin", uz: "Admin" },

  // Editor page
  "editor.back": { ru: "Назад", en: "Back", uz: "Orqaga" },
  "editor.editing": { ru: "Редактирование", en: "Editing", uz: "Tahrirlash" },
  "editor.newProject": { ru: "Новый проект", en: "New project", uz: "Yangi loyiha" },
  "editor.preview": { ru: "Превью", en: "Preview", uz: "Ko'rish" },
  "editor.code": { ru: "Код", en: "Code", uz: "Kod" },
  "editor.publish": { ru: "Опубликовать", en: "Publish", uz: "Nashr qilish" },
  "editor.save": { ru: "Сохранить", en: "Save", uz: "Saqlash" },
  "editor.saving": { ru: "Сохранение...", en: "Saving...", uz: "Saqlanmoqda..." },
  "editor.saveCode": { ru: "Сохранить код", en: "Save code", uz: "Kodni saqlash" },
  "editor.siteCreated": { ru: "Сайт создан!", en: "Site created!", uz: "Sayt yaratildi!" },
  "editor.siteUpdated": { ru: "Сайт обновлён!", en: "Site updated!", uz: "Sayt yangilandi!" },
  "editor.projectSaved": { ru: "Проект сохранён!", en: "Project saved!", uz: "Loyiha saqlandi!" },
  "editor.linkName": { ru: "Имя сайта (в ссылке)", en: "Site name (in URL)", uz: "Sayt nomi (havolada)" },
  "editor.linkSettings": { ru: "Настройки ссылки", en: "Link settings", uz: "Havola sozlamalari" },
  "editor.seoSettings": { ru: "SEO настройки", en: "SEO settings", uz: "SEO sozlamalari" },
  "editor.seoTitle": { ru: "Заголовок (title)", en: "Title", uz: "Sarlavha (title)" },
  "editor.seoDesc": { ru: "Описание (meta description)", en: "Description (meta)", uz: "Tavsif (meta description)" },
  "editor.seoKeywords": { ru: "Ключевые слова", en: "Keywords", uz: "Kalit so'zlar" },
  "editor.settings": { ru: "Настройки", en: "Settings", uz: "Sozlamalar" },
  "editor.yourSite": { ru: "Ваш сайт:", en: "Your site:", uz: "Sizning saytingiz:" },
  "editor.projectSavedLabel": { ru: "Проект сохранен:", en: "Project saved:", uz: "Loyiha saqlandi:" },
  "editor.copy": { ru: "Копировать", en: "Copy", uz: "Nusxalash" },
  "editor.open": { ru: "Открыть", en: "Open", uz: "Ochish" },
  "editor.linkCopied": { ru: "Ссылка скопирована!", en: "Link copied!", uz: "Havola nusxalandi!" },
  "editor.enterName": { ru: "Укажите имя для ссылки", en: "Enter a name for the link", uz: "Havola uchun nom kiriting" },
  "editor.invalidName": { ru: "Имя может содержать только буквы (a-z), цифры и дефис", en: "Name can only contain letters (a-z), numbers and hyphens", uz: "Nom faqat harflar (a-z), raqamlar va defislardan iborat bo'lishi mumkin" },
  "editor.nameTaken": { ru: "Это имя уже занято, выберите другое", en: "This name is already taken, choose another", uz: "Bu nom allaqachon band, boshqasini tanlang" },
  "editor.saveError": { ru: "Ошибка сохранения: ", en: "Save error: ", uz: "Saqlash xatosi: " },
  "editor.siteNotFound": { ru: "Сайт не найден", en: "Site not found", uz: "Sayt topilmadi" },
  "editor.seoDescPlaceholder": { ru: "Описание для поисковых систем", en: "Description for search engines", uz: "Qidiruv tizimlari uchun tavsif" },

  // Dashboard
  "dashboard.title": { ru: "Мои проекты", en: "My Projects", uz: "Mening loyihalarim" },
  "dashboard.create": { ru: "Создать проект", en: "Create project", uz: "Loyiha yaratish" },
  "dashboard.empty": { ru: "У вас пока нет проектов", en: "You don't have any projects yet", uz: "Sizda hali loyihalar yo'q" },
};

export function t(key: string, lang: Language): string {
  return translations[key]?.[lang] ?? translations[key]?.["ru"] ?? key;
}
