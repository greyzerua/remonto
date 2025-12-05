# Інструкція з налаштування Firebase Cloud Messaging (FCM)

## 📋 Зміст
1. [Підготовка Firebase Console](#1-підготовка-firebase-console)
2. [Налаштування для Android](#2-налаштування-для-android) ⭐ **ПОЧНІТЬ З ЦЬОГО**
3. [Налаштування для iOS](#3-налаштування-для-ios) (опціонально, можна зробити пізніше)
4. [Тестування нотифікацій](#4-тестування-нотифікацій)
5. [Налаштування Cloud Functions (опціонально)](#5-налаштування-cloud-functions-опціонально)

---

## 🚀 Швидкий старт (Android)

**Для початку роботи достатньо налаштувати тільки Android:**
- ✅ Безкоштовно
- ✅ Не потрібне Apple Developer Program
- ✅ Повноцінна підтримка FCM
- ✅ Можна протестувати всі функції

**iOS можна налаштувати пізніше, коли буде потрібно.**

---

## 1. Підготовка Firebase Console

### Крок 1.1: Відкрийте Firebase Console
1. Перейдіть на [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Увійдіть у свій Google акаунт
3. Виберіть ваш проєкт (або створіть новий)

### Крок 1.2: Перевірте налаштування проєкту
1. Відкрийте **⚙️ Project Settings** (значок шестерні біля назви проєкту)
2. Перейдіть на вкладку **Cloud Messaging**
3. Переконайтеся, що Cloud Messaging API увімкнено

---

## 2. Налаштування для Android ⭐

**Це основний крок для початку роботи!**

### Крок 2.1: Додайте Android додаток (якщо ще не додано)

1. У Firebase Console перейдіть до **⚙️ Project Settings**
2. Прокрутіть до розділу **Your apps**
3. Натисніть **Add app** → виберіть **Android**
4. Заповніть форму:
   - **Android package name**: `com.remonto` (або ваш package name)
   - **App nickname** (опціонально): `Remonto Android`
   - **Debug signing certificate SHA-1** (опціонально для development)
5. Натисніть **Register app**

### Крок 2.2: Завантажте google-services.json

**Важливо**: Файл `google-services.json` доступний тільки для **Android app**, не для Web app!

1. У розділі **Your apps** виберіть ваш **Android app** (наприклад, "Remonto Android")
2. У панелі **SDK setup and configuration** натисніть кнопку **Download** біля `google-services.json`
3. **ВАЖЛИВО**: Завантажте цей файл у корінь вашого проєкту (`d:\remonto\google-services.json`)
4. Файл містить конфігурацію для підключення Android додатку до Firebase

### Крок 2.3: Оновіть app.json

Файл `app.json` вже оновлено з налаштуваннями для Android:
```json
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/transparent-logo.png"
  },
  "edgeToEdgeEnabled": true,
  "predictiveBackGestureEnabled": false,
  "useNextNotificationsApi": true
}
```

### Крок 2.4: Налаштування для Cloud Functions (опціонально)

**Важливо**: Firebase більше не використовує Server Key (Legacy API застарів). Для Cloud Functions використовується **Service Account** через Firebase Admin SDK.

1. У Firebase Console перейдіть до **⚙️ Project Settings** → вкладка **Cloud Messaging**
2. Переконайтеся, що **Firebase Cloud Messaging API (V1)** увімкнено (має бути "Enabled")
3. Запишіть **Sender ID** (наприклад, `450755066363`) - він може знадобитися
4. Для Cloud Functions використовуйте **Service Account** (див. розділ 5)

**Примітка**: Якщо ви бачите "Cloud Messaging API (Legacy)" як "Disabled" - це нормально. Legacy API застарів і більше не підтримується.

**✅ Після виконання цих кроків Android готовий до використання!**

---

## 3. Налаштування для iOS (опціонально)

**⚠️ Примітка**: Цей розділ можна пропустити, якщо ви починаєте з Android. iOS можна налаштувати пізніше.

**Для налаштування APNs потрібне активне членство в Apple Developer Program ($99/рік).**

### Коли налаштовувати iOS:
- ✅ Якщо у вас вже є Apple Developer Program
- ✅ Коли будете готові до production iOS додатку
- ⏸️ Можна відкласти, якщо починаєте з Android

### Крок 3.1: Додайте iOS додаток

1. У Firebase Console перейдіть до **⚙️ Project Settings**
2. Прокрутіть до розділу **Your apps**
3. Натисніть **Add app** → виберіть **iOS**
4. Заповніть форму:
   - **iOS bundle ID**: `com.remonto` (або ваш bundle ID)
   - **App nickname** (опціонально): `Remonto iOS`
5. Натисніть **Register app**

### Крок 3.2: Завантажте GoogleService-Info.plist

1. Після реєстрації Firebase надасть файл `GoogleService-Info.plist`
2. Завантажте його у корінь проєкту (`d:\remonto\GoogleService-Info.plist`)

### Крок 3.3: Налаштування APNs (Apple Push Notification service)

#### Варіант A: Використання APNs Authentication Key (рекомендовано)

1. Перейдіть до [Apple Developer Portal](https://developer.apple.com/account/)
2. Відкрийте **Certificates, Identifiers & Profiles**
3. Перейдіть до **Keys** → натисніть **+**
4. Заповніть:
   - **Key Name**: `Firebase APNs Key`
   - Виберіть **Apple Push Notifications service (APNs)**
5. Натисніть **Continue** → **Register**
6. Завантажте `.p8` файл (зберігайте його безпечно!)
7. Запишіть **Key ID**

#### Варіант B: Використання APNs Certificate

1. У Apple Developer Portal створіть APNs Certificate
2. Завантажте `.p12` файл
3. Завантажте його в Firebase Console

### Крок 3.4: Завантажте APNs ключ у Firebase

1. У Firebase Console перейдіть до **⚙️ Project Settings**
2. Вкладка **Cloud Messaging**
3. Прокрутіть до розділу **Apple app configuration**
4. Натисніть **Upload** біля **APNs Authentication Key**
5. Завантажте `.p8` файл та введіть **Key ID** та **Team ID**
6. Натисніть **Upload**

---

## 4. Тестування нотифікацій

### ⚠️ Важливо: Expo Go обмеження

**З Expo SDK 53+ push-нотифікації (FCM) не працюють в Expo Go!**

Для тестування FCM потрібен **development build** або **production build**.

### Крок 4.1: Створення Development Build (рекомендовано)

#### Варіант A: Локальний development build (швидше)

1. Встановіть Android Studio (якщо ще не встановлено)
2. Налаштуйте Android SDK та емулятор
3. Виконайте команди:

```bash
# Генеруємо нативні файли
npx expo prebuild

# Запускаємо на Android пристрої/емуляторі
npx expo run:android
```

#### Варіант B: EAS Build (для фізичного пристрою)

```bash
# Встановіть EAS CLI
npm install -g eas-cli

# Увійдіть у Expo акаунт
eas login

# Створіть development build
eas build --profile development --platform android
```

### Крок 4.2: Тестування нотифікацій

1. Запустіть додаток через development build
2. Відкрийте додаток на **Android пристрої** (фізичному або емуляторі)
3. Увійдіть у додаток
4. Перейдіть до **Налаштування** → **Нотифікації**
5. Натисніть **Push-нотифікації** для увімкнення
6. Дозвольте нотифікації, коли система запитає

**✅ На Android з development build все має працювати!**

### Крок 4.2: Тестування через Firebase Console

1. У Firebase Console перейдіть до **Cloud Messaging**
2. Натисніть **Send your first message**
3. Заповніть форму:
   - **Notification title**: `Тестова нотифікація`
   - **Notification text**: `Це тестове повідомлення`
4. Натисніть **Send test message**
5. Введіть FCM токен (можна отримати з консолі додатку або Firestore)
6. Натисніть **Test**

### Крок 4.3: Перевірка токенів у Firestore

1. У Firebase Console перейдіть до **Firestore Database**
2. Відкрийте колекцію `users`
3. Виберіть документ користувача
4. Перевірте поля:
   - `fcmToken` - має містити токен
   - `notificationsEnabled` - має бути `true`

---

## 5. Налаштування Cloud Functions (опціонально)

Для автоматичної відправки нотифікацій при подіях у Firestore.

### Крок 5.1: Встановлення Firebase CLI

```bash
npm install -g firebase-tools
```

### Крок 5.2: Вхід у Firebase

```bash
firebase login
```

### Крок 5.3: Отримання Service Account Key

**Важливо**: Замість Server Key тепер використовується Service Account.

1. У Firebase Console перейдіть до **⚙️ Project Settings**
2. Вкладка **Service accounts**
3. Натисніть **Generate new private key**
4. Завантажте JSON файл (зберігайте його безпечно!)
5. Цей файл містить credentials для Firebase Admin SDK

### Крок 5.4: Ініціалізація Functions

```bash
cd d:\remonto
firebase init functions
```

Виберіть:
- **JavaScript** або **TypeScript**
- **Install dependencies**: Yes

### Крок 5.5: Налаштування Service Account

1. Скопіюйте завантажений Service Account JSON файл у папку `functions/` (або збережіть його безпечно)
2. Або встановіть змінну оточення `GOOGLE_APPLICATION_CREDENTIALS` з шляхом до файлу

**Альтернатива**: Якщо ви deploy через `firebase deploy`, Firebase автоматично використовує ваш акаунт.

### Крок 5.6: Створення Cloud Functions

**Файл `functions/index.js` вже створено!** Він містить функції для автоматичної відправки нотифікацій при подіях у Firestore.

**Що роблять ці функції:**
1. `onProjectAccessGranted` - відправляє нотифікацію, коли користувач отримує доступ до проєктів
2. `onExpenseAdded` - відправляє нотифікацію всім членам проєкту, коли додається нова витрата
3. `onProjectMemberAdded` - відправляє нотифікацію, коли користувач додається до проєкту

**Якщо потрібно налаштувати вручну, створіть файл `functions/index.js`:**

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Відправити FCM нотифікацію користувачу
 */
async function sendFCMNotification(userId, title, body, data = {}) {
  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log('Користувача не знайдено:', userId);
      return;
    }

    const userData = userDoc.data();
    
    if (!userData.notificationsEnabled || !userData.fcmToken) {
      console.log('Нотифікації вимкнені або токен відсутній для:', userId);
      return;
    }

    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      token: userData.fcmToken,
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('Нотифікацію відправлено:', response);
    return response;
  } catch (error) {
    console.error('Помилка відправки FCM нотифікації:', error);
    throw error;
  }
}

/**
 * Cloud Function: Нотифікація при наданні доступу до проєкту
 */
exports.onProjectAccessGranted = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const userId = context.params.userId;

    const beforeShared = before.sharedUsers || [];
    const afterShared = after.sharedUsers || [];
    
    const newUsers = afterShared.filter(uid => !beforeShared.includes(uid));
    
    if (newUsers.length > 0) {
      const ownerDoc = await admin.firestore().collection('users').doc(userId).get();
      const ownerData = ownerDoc.data();
      
      for (const newUserId of newUsers) {
        await sendFCMNotification(
          newUserId,
          'Доступ надано',
          `${ownerData.displayName || ownerData.email} надав вам доступ до своїх проєктів`,
          {
            type: 'access_granted',
            ownerId: userId,
          }
        );
      }
    }
  });

/**
 * Cloud Function: Нотифікація при додаванні витрати
 */
exports.onExpenseAdded = functions.firestore
  .document('expenses/{expenseId}')
  .onCreate(async (snap, context) => {
    const expense = snap.data();
    const projectId = expense.projectId;

    const projectDoc = await admin.firestore().collection('projects').doc(projectId).get();
    if (!projectDoc.exists) return;

    const project = projectDoc.data();
    const members = project.members || [];
    const createdBy = expense.createdBy;

    const recipients = members.filter(memberId => memberId !== createdBy);
    
    for (const memberId of recipients) {
      await sendFCMNotification(
        memberId,
        'Нова витрата',
        `Додано витрату "${expense.categoryName}" до проєкту "${project.name}"`,
        {
          type: 'expense_added',
          projectId: projectId,
          expenseId: context.params.expenseId,
        }
      );
    }
  });
```

### Крок 5.7: Деploy Cloud Functions

```bash
firebase deploy --only functions
```

**Примітка**: Firebase Admin SDK автоматично використовує credentials з вашого Firebase акаунту при deploy через `firebase deploy`. Service Account JSON файл потрібен тільки для локального тестування або якщо ви deploy з іншого сервера.

---

## 🔧 Вирішення проблем

### Проблема: Токен не зберігається в Firestore

**Рішення:**
1. Перевірте, чи користувач авторизований
2. Перевірте Firestore rules (мають дозволяти оновлення `fcmToken`)
3. Перевірте консоль на помилки

### Проблема: Нотифікації не приходять на Android

**Рішення:**
1. Перевірте, чи файл `google-services.json` знаходиться в корені проєкту
2. Перевірте, чи дозволено нотифікації в налаштуваннях пристрою
3. Перевірте, чи канал `default` створено для Android

### Проблема: Нотифікації не приходять на iOS

**Рішення:**
1. Перевірте, чи завантажено APNs ключ у Firebase Console
2. Перевірте, чи правильно налаштовано bundle ID
3. Перевірте, чи дозволено нотифікації в налаштуваннях пристрою

### Проблема: Expo Go не отримує нотифікації

**Рішення:**
- ⚠️ **Expo Go більше НЕ підтримує push-нотифікації (FCM) з SDK 53+**
- Для повноцінної роботи FCM **обов'язково** використовуйте development build:
  ```bash
  npx expo prebuild
  npx expo run:android
  # або
  npx expo run:ios
  ```
- Або використовуйте EAS Build:
  ```bash
  eas build --profile development --platform android
  ```

### Проблема: Помилка "Android Push notifications functionality was removed from Expo Go"

**Рішення:**
- Це нормальне повідомлення для Expo Go з SDK 53+
- FCM працює **тільки** в development build або production build
- Створіть development build за інструкцією вище

---

## 📚 Додаткові ресурси

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Cloud Functions Documentation](https://firebase.google.com/docs/functions)

---

## ✅ Чеклист налаштування (Android)

- [x] Firebase проєкт створено
- [ ] Android додаток додано в Firebase
- [ ] `google-services.json` завантажено
- [ ] Firestore rules оновлено
- [ ] Додаток протестовано на Android
- [ ] Нотифікації працюють ✅

**iOS (опціонально, пізніше):**
- [ ] iOS додаток додано в Firebase (коли буде потрібно)
- [ ] `GoogleService-Info.plist` завантажено (коли буде потрібно)
- [ ] Apple Developer Program активовано (коли буде потрібно)
- [ ] APNs ключ завантажено в Firebase (коли буде потрібно)

---

**💡 Порада**: Почніть з Android - це найшвидший спосіб перевірити, що все працює. iOS можна налаштувати пізніше, коли буде потрібно.

