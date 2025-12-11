import * as Notifications from 'expo-notifications';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User } from '../types';

/**
 * ВАЖЛИВО для Android Badge:
 * - Badge з цифрами підтримується не всіма launcher'ами
 * - Стандартний Android launcher може показувати тільки крапку без цифр
 * - Деякі launcher'и (Samsung, Xiaomi, тощо) можуть показувати цифри
 * - expo-notifications використовує NotificationChannel для badge, але це не гарантує відображення цифр
 * - Якщо badge не показує цифри, це обмеження launcher'а, а не помилка коду
 */

// Зберігаємо поточний стан додатку для точнішої перевірки
let currentAppState: AppStateStatus = AppState.currentState;

// Слухаємо зміни стану додатку (правильний API для React Native)
const subscription = AppState.addEventListener('change', (nextAppState) => {
  currentAppState = nextAppState;
});

// Налаштування обробки нотифікацій
// Не показуємо системну нотифікацію коли додаток на передньому плані (там вже є Toast)
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Перевіряємо стан безпосередньо в момент обробки нотифікації
    // Використовуємо поточний стан для максимальної точності
    const currentState = AppState.currentState;
    const savedState = currentAppState;
    
    // Додаток вважається на передньому плані тільки якщо стан точно 'active'
    // Використовуємо обидва значення - якщо хоча б один 'active', значить додаток на передньому плані
    const isAppInForeground = currentState === 'active' || savedState === 'active';
    
    // Перевіряємо, чи це remote push notification
    // Type guard для перевірки типу trigger
    const trigger = notification.request.trigger;
    const isRemoteNotification = trigger && 
      ('type' in trigger && trigger.type === 'push');
    
    // Для Android badge працює через кількість активних нотифікацій у каналі
    // setBadgeCountAsync не працює на Android через expo-notifications
    // Тому для відображення badge потрібно залишати нотифікації в системі
    
    // Якщо додаток на передньому плані - блокуємо показ, але залишаємо для badge
    if (isAppInForeground) {
      // Для remote notifications на Android
      if (Platform.OS === 'android' && isRemoteNotification) {
        // Залишаємо нотифікацію в системі для badge, але не показуємо її
        // Це дозволить badge відображати кількість непрочитаних нотифікацій
        return {
          shouldShowAlert: false, // Не показувати alert
          shouldShowBanner: false, // Не показувати банер
          shouldShowList: true, // Додаємо до списку для badge count
          shouldPlaySound: false, // Без звуку
          shouldSetBadge: true, // Оновлюємо badge
        };
      }
      
      // Для iOS та локальних нотифікацій
      return {
        shouldShowAlert: false, // iOS - не показувати alert
        shouldShowBanner: false, // Android/iOS - не показувати банер
        shouldShowList: true, // Додаємо до списку для історії та badge
        shouldPlaySound: false, // Без звуку
        shouldSetBadge: true, // Бейдж завжди
      };
    }
    
    // Коли додаток у фоні або закритий - показуємо нотифікацію
    
    return {
      shouldShowAlert: true, // iOS - показувати alert
      shouldShowBanner: true, // Android/iOS - показувати банер
      shouldShowList: true, // Додаємо до списку
      shouldPlaySound: true, // Зі звуком
      shouldSetBadge: true, // Бейдж завжди
    };
  },
});

/**
 * Запит дозволів на нотифікації
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  // Для Android потрібен канал
  if (Platform.OS === 'android') {
    try {
      // Спочатку видаляємо старий канал, якщо він існує (щоб застосувати нові налаштування)
      // На Android канали не можна редагувати після створення, тому видаляємо і створюємо заново
      await Notifications.deleteNotificationChannelAsync('default');
    } catch (error) {
      // Канал може не існувати - це нормально
    }
    
    // Створюємо новий канал з оновленими налаштуваннями
    // Іконка для нотифікацій налаштовується через app.json (expo-notifications plugin)
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Remonto',
      description: 'Сповіщення про події в проєктах та доступ від інших користувачів',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1F2C3D', // Колір індикатора світла
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      showBadge: true, // Увімкнути badge для каналу
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  return true;
}

/**
 * Отримати FCM токен через expo-notifications
 * Expo автоматично інтегрується з FCM для Android та APNs для iOS
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    // Отримуємо токен через expo-notifications
    // Для Android це буде FCM токен, для iOS - APNs токен
    const token = await Notifications.getDevicePushTokenAsync();
    
    return token.data;
  } catch (error) {
    console.error('Помилка отримання FCM token:', error);
    return null;
  }
}

/**
 * Зберегти FCM token в Firestore
 */
export async function saveFCMTokenToFirestore(
  userId: string,
  token: string | null
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    
    // Перевіряємо, чи існує документ
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      // Якщо документ існує, оновлюємо його
      await updateDoc(userRef, {
        fcmToken: token || null,
        notificationsEnabled: token !== null,
        tokenUpdatedAt: new Date().toISOString(),
      });
    } else {
      // Якщо документа немає, створюємо його з merge: true
      // Це може статися, якщо користувач увійшов не через реєстрацію
      await setDoc(userRef, {
        id: userId,
        fcmToken: token || null,
        notificationsEnabled: token !== null,
        tokenUpdatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (error) {
    console.error('Помилка збереження FCM token:', error);
    throw error;
  }
}

/**
 * Видалити FCM token з Firestore
 */
export async function removeFCMTokenFromFirestore(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    // Явно встановлюємо notificationsEnabled: false, щоб Cloud Functions не відправляли нотифікації
    await updateDoc(userRef, {
      fcmToken: null,
      notificationsEnabled: false,
      tokenUpdatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Помилка видалення FCM token:', error);
    throw error;
  }
}

/**
 * Оновити стан нотифікацій в Firestore без зміни токену
 */
export async function updateNotificationsEnabled(userId: string, enabled: boolean): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      notificationsEnabled: enabled,
    });
  } catch (error) {
    console.error('Помилка оновлення стану нотифікацій:', error);
    throw error;
  }
}

/**
 * Отримати статус дозволів
 */
export async function getNotificationPermissionsStatus(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  return {
    granted: status === 'granted',
    canAskAgain: canAskAgain ?? false,
  };
}

/**
 * Отримати FCM токен користувача з Firestore
 */
export async function getUserFCMToken(userId: string): Promise<string | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return null;
    }
    const userData = userDoc.data() as User;
    return userData.fcmToken || null;
  } catch (error) {
    console.error('Помилка отримання FCM token користувача:', error);
    return null;
  }
}

/**
 * Очистити badge count (встановити в 0)
 * 
 * ВАЖЛИВО для Android:
 * - setBadgeCountAsync не працює на Android через expo-notifications
 * - Для очищення badge потрібно видалити всі нотифікації з каналу
 */
export async function clearBadgeCount(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      // На Android видаляємо всі нотифікації для очищення badge
      await Notifications.dismissAllNotificationsAsync();
    } else {
      // Для iOS встановлюємо badge в 0
      await Notifications.setBadgeCountAsync(0);
    }
  } catch (error) {
    console.error('Помилка очищення badge count:', error);
  }
}

/**
 * Отримати поточний badge count
 */
export async function getBadgeCount(): Promise<number> {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.error('Помилка отримання badge count:', error);
    return 0;
  }
}

/**
 * Очистити badge count та оновити в Firestore
 */
export async function clearBadgeCountAndUpdateFirestore(userId: string): Promise<void> {
  try {
    // Очищаємо badge локально
    await clearBadgeCount();
    
    // Оновлюємо badgeCount в Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      badgeCount: 0,
    });
  } catch (error) {
    console.error('Помилка очищення badge count та оновлення Firestore:', error);
  }
}

/**
 * Синхронізувати badge count з Firestore (для Android, коли додаток закритий)
 * Викликається при старті додатку, щоб оновити badge з сервера
 * 
 * ВАЖЛИВО для Android:
 * - setBadgeCountAsync не працює на Android через expo-notifications
 * - Badge на Android відображається автоматично на основі кількості активних нотифікацій
 * - Для відображення badge потрібно залишати нотифікації в системі
 */
export async function syncBadgeCountFromFirestore(userId: string): Promise<void> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data() as User;
      const badgeCount = userData.badgeCount || 0;
      
      if (Platform.OS !== 'android') {
        // Для iOS встановлюємо badge count
        await Notifications.setBadgeCountAsync(badgeCount);
      }
    }
  } catch (error) {
    console.error('Помилка синхронізації badge count з Firestore:', error);
  }
}

/**
 * Оновити badge count з даних нотифікації
 * Викликається при отриманні нотифікації, навіть коли додаток закритий
 * 
 * ВАЖЛИВО для Android:
 * - setBadgeCountAsync не працює на Android через expo-notifications
 * - Badge відображається автоматично на основі кількості активних нотифікацій
 * - Функція залишена для iOS та майбутньої підтримки
 */
export async function updateBadgeFromNotification(notification: Notifications.Notification): Promise<void> {
  try {
    const trigger = notification.request.trigger;
    const isRemoteNotification = trigger && 
      ('type' in trigger && trigger.type === 'push');
    
    if (isRemoteNotification) {
      const badgeCountValue = notification.request.content.data?.badgeCount;
      const badgeCount = badgeCountValue && typeof badgeCountValue === 'string'
        ? parseInt(badgeCountValue, 10) 
        : null;
      
      if (badgeCount !== null && !isNaN(badgeCount) && badgeCount >= 0) {
        if (Platform.OS !== 'android') {
          // Для iOS встановлюємо badge count
          await Notifications.setBadgeCountAsync(badgeCount);
        }
      }
    }
  } catch (error) {
    console.error('Помилка оновлення badge з нотифікації:', error);
  }
}

