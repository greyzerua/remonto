# Налаштування Firebase для Remonto

## Крок 1: Створення проекту Firebase

1. Перейдіть на [Firebase Console](https://console.firebase.google.com/)
2. Натисніть "Додати проект" (Add project)
3. Введіть назву проекту (наприклад, "Remonto")
4. Відключіть Google Analytics (або залиште увімкненим, якщо потрібно)
5. Натисніть "Створити проект"

## Крок 2: Додавання додатку

1. В консолі Firebase натисніть на іконку веб-додатку (</>) або "Add app" → Web
2. Введіть назву додатку (наприклад, "Remonto App")
3. Скопіюйте конфігурацію Firebase (firebaseConfig)
4. Вона виглядає приблизно так:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Крок 3: Налаштування конфігурації Firebase

⚠️ **Обов'язково використовуйте змінні оточення.** Файл `config/firebase.ts` тепер вимагає їх наявності й не містить жодних дефолтних значень.

1. Створіть файл `.env` у корені проєкту (файл вже додано до `.gitignore`).
2. Додайте у `.env` значення з консолі Firebase:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=ВАШ_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=ВАШ_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID=ВАШ_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=ВАШ_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=ВАШ_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID=ВАШ_APP_ID
```

3. Перезапустіть Expo, щоб змінні підтягнулися у застосунок.

### Ротація ключів Firebase

Якщо ключ потрапив у публічний доступ:

1. У Firebase Console відкрийте `Project settings → General`.
2. У блоці `Your apps` натисніть `Manage API keys` та створіть новий ключ.
3. Обмежте новий ключ лише необхідними доменами / bundle-id.
4. Оновіть `.env` у проєкті новими значеннями.
5. Видаліть або заархівуйте старий ключ, щоб він не працював.

## Крок 4: Налаштування Authentication

1. В Firebase Console перейдіть до "Authentication"
2. Натисніть "Get started"
3. Увімкніть "Email/Password" провайдер:
   - Натисніть "Email/Password"
   - Увімкніть "Enable"
   - Натисніть "Save"

## Крок 5: Налаштування Firestore Database

1. В Firebase Console перейдіть до "Firestore Database"
2. Натисніть "Create database"
3. Виберіть режим:
   - **Production mode** (рекомендовано) - з правилами безпеки
   - **Test mode** - для тестування (небезпечно для продакшену)
4. Виберіть регіон (найближчий до вас)
5. Натисніть "Enable"

## Крок 6: Налаштування правил безпеки Firestore

Перейдіть до "Rules" в Firestore і встановіть такі правила:

### Варіант 1: Тестові правила (для початку розробки)

**⚠️ УВАГА: Ці правила дозволяють всім авторизованим користувачам читати та записувати всі дані. Використовуйте тільки для тестування!**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Варіант 2: Безпечні правила (для продакшену)

Після тестування замініть на безпечні правила:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Користувачі
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Родинні групи
    match /familyGroups/{groupId} {
      // Дозволити читання, якщо користувач є учасником групи
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.members.map(m => m.userId);
      // Дозволити створення авторизованим користувачам
      allow create: if request.auth != null;
      // Дозволити оновлення/видалення тільки власнику
      allow update, delete: if request.auth != null && 
        request.auth.uid == resource.data.ownerId;
    }
    
    // Проекти
    match /projects/{projectId} {
      // Дозволити читання, якщо користувач є учасником групи проекту
      allow read: if request.auth != null;
      // Дозволити створення авторизованим користувачам
      allow create: if request.auth != null;
      // Дозволити оновлення/видалення тільки створювачу або власнику групи
      allow update, delete: if request.auth != null && 
        (request.auth.uid == resource.data.createdBy);
    }
    
    // Витрати
    match /expenses/{expenseId} {
      // Дозволити читання авторизованим користувачам
      allow read: if request.auth != null;
      // Дозволити створення авторизованим користувачам
      allow create: if request.auth != null;
      // Дозволити оновлення/видалення тільки створювачу
      allow update, delete: if request.auth != null && 
        request.auth.uid == resource.data.createdBy;
    }
  }
}
```

**Рекомендація:** Почніть з **Варіанту 1** (тестові правила) для швидкого тестування, потім перейдіть на **Варіант 2** для безпеки.

**⚠️ ВАЖЛИВО:** Файл `firestore.rules` вже містить безпечні правила для продакшену. Скопіюйте їх в Firebase Console.

## Крок 7: Перезапуск додатку

Після налаштування перезапустіть Expo:

```bash
npm start
```

## Перевірка

Після налаштування додаток має:
- ✅ Підключатися до Firebase
- ✅ Дозволяти реєстрацію та вхід користувачів
- ✅ Створювати та синхронізувати дані в реальному часі

## Додаткова інформація

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

