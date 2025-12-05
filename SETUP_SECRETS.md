# Налаштування секретів

## ⚠️ Важливо

Файли з секретами (`app.json`, `google-services.json`, `.firebaserc`, `firebase.json`) додані до `.gitignore` і не повинні бути закомічені в репозиторій.

## Крок 1: Налаштування Firebase

### Варіант А: Використання google-services.json (рекомендовано) ⭐

Найпростіший спосіб - завантажити `google-services.json` з Firebase Console, він містить всі необхідні значення.

**Покрокова інструкція:**

1. Відкрийте [Firebase Console](https://console.firebase.google.com/)
2. Виберіть ваш проект (наприклад, `remonto-d532a`)
3. Натисніть на **⚙️ Project Settings** (значок шестерні біля назви проекту вгорі зліва)
4. Прокрутіть до розділу **Your apps**
5. Знайдіть ваш **Android app** (наприклад, "Remonto Android") і натисніть на нього
6. У розділі **SDK setup and configuration** натисніть кнопку **Download** біля `google-services.json`
7. Збережіть файл у корінь проекту: `d:\remonto\google-services.json`

**Тепер скопіюйте значення з `google-services.json` в `app.json`:**

Відкрийте завантажений `google-services.json` і знайдіть:

```json
{
  "project_info": {
    "project_id": "remonto-d532a",                    // → projectId
    "project_number": "450755066363",                 // → messagingSenderId
    "storage_bucket": "remonto-d532a.firebasestorage.app"  // → storageBucket
  },
  "client": [{
    "client_info": {
      "mobilesdk_app_id": "1:450755066363:android:15e1afcb6f88b225fef35e"  // → appId
    },
    "api_key": [{
      "current_key": "AIzaSyBNAu5x34kJjv4RndQJZZIh-Pe2pdFt3GQ"  // → apiKey
    }]
  }]
}
```

Заповніть `app.json`:
- `apiKey`: значення з `api_key[0].current_key`
- `projectId`: значення з `project_info.project_id`
- `storageBucket`: значення з `project_info.storage_bucket`
- `messagingSenderId`: значення з `project_info.project_number`
- `appId`: значення з `client[0].client_info.mobilesdk_app_id`
- `authDomain`: `projectId + ".firebaseapp.com"` (наприклад, `"remonto-d532a.firebaseapp.com"`)

### Варіант Б: З Firebase SDK snippet

1. Створіть файл `app.json` на основі `app.json.example`:
   ```bash
   cp app.json.example app.json
   ```

2. Заповніть Firebase конфігурацію в `app.json`. Всі значення можна знайти в Firebase Console:

   **Де знайти значення:**
   
   1. Відкрийте [Firebase Console](https://console.firebase.google.com/)
   2. Виберіть ваш проект
   3. Перейдіть до **⚙️ Project Settings** (значок шестерні біля назви проекту)
   4. Прокрутіть до розділу **Your apps** → виберіть ваш **Android app**
   5. У розділі **SDK setup and configuration** → **Firebase SDK snippet** → виберіть **Config**
   
   Там ви побачите всі необхідні значення:
   
   ```json
   "extra": {
     "firebase": {
       "apiKey": "AIza...",           // З Firebase SDK snippet → Config
       "authDomain": "...",            // З Firebase SDK snippet → Config (projectId + ".firebaseapp.com")
       "projectId": "...",            // З Firebase SDK snippet → Config
       "storageBucket": "...",        // З Firebase SDK snippet → Config
       "messagingSenderId": "...",    // З Firebase SDK snippet → Config (або з Cloud Messaging → Sender ID)
       "appId": "1:...:android:..."   // З Firebase SDK snippet → Config (mobilesdk_app_id)
     }
   }
   ```
   
   **Альтернативно:** Всі значення також є в файлі `google-services.json`:
   - `apiKey` → `client[0].api_key[0].current_key`
   - `projectId` → `project_info.project_id`
   - `storageBucket` → `project_info.storage_bucket`
   - `messagingSenderId` → `project_info.project_number`
   - `appId` → `client[0].client_info.mobilesdk_app_id`
   - `authDomain` → `projectId + ".firebaseapp.com"`

3. Створіть файл `google-services.json` на основі `google-services.json.example`:
   ```bash
   cp google-services.json.example google-services.json
   ```

4. Завантажте `google-services.json` з Firebase Console:
   - Відкрийте [Firebase Console](https://console.firebase.google.com/)
   - Виберіть ваш проект
   - Перейдіть до Project Settings → Your apps → Android app
   - Завантажте `google-services.json` і замініть файл у проекті

## Крок 2: Налаштування Firebase CLI (опціонально)

Якщо використовуєте Firebase CLI:

1. Створіть файл `.firebaserc`:
   ```json
   {
     "projects": {
       "default": "YOUR_PROJECT_ID"
     }
   }
   ```

2. Створіть файл `firebase.json` (якщо потрібен):
   ```json
   {
     "functions": [
       {
         "source": "functions",
         "codebase": "default"
       }
     ]
   }
   ```

## Альтернатива: Environment Variables

Замість `app.json` можна використовувати environment variables:

1. Створіть файл `.env` на основі `.env.example`:
   ```bash
   cp .env.example .env
   ```

2. Заповніть значення в `.env`:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

3. `config/firebase.ts` автоматично прочитає значення з environment variables.

## Перевірка

Переконайтеся, що файли з секретами додані до `.gitignore`:
- `app.json`
- `google-services.json`
- `.firebaserc`
- `firebase.json`
- `.env`
- `.env.local`

## Ротація секретів

Якщо секрети були викриті в git історії:
1. Змініть всі викриті ключі в Firebase Console
2. Використайте `git filter-branch` або `git filter-repo` для видалення секретів з історії
3. Або створіть новий проект Firebase з новими ключами

