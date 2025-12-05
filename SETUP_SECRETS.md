# Налаштування секретів

## ⚠️ Важливо

Файли з секретами (`app.json`, `google-services.json`, `.firebaserc`, `firebase.json`) додані до `.gitignore` і не повинні бути закомічені в репозиторій.

## Крок 1: Налаштування Firebase

1. Створіть файл `app.json` на основі `app.json.example`:
   ```bash
   cp app.json.example app.json
   ```

2. Заповніть Firebase конфігурацію в `app.json`:
   ```json
   "extra": {
     "firebase": {
       "apiKey": "YOUR_API_KEY",
       "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
       "projectId": "YOUR_PROJECT_ID",
       "storageBucket": "YOUR_PROJECT_ID.firebasestorage.app",
       "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
       "appId": "YOUR_APP_ID"
     }
   }
   ```

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

