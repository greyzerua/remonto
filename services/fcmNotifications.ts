import * as Notifications from 'expo-notifications';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User } from '../types';

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
    
    // Якщо додаток на передньому плані - повністю блокуємо показ нотифікації
    if (isAppInForeground) {
      // Для remote notifications на Android потрібно повністю блокувати показ
      if (Platform.OS === 'android' && isRemoteNotification) {
        // Повертаємо об'єкт, який повністю блокує показ
        return {
          shouldShowAlert: false,
          shouldShowBanner: false,
          shouldShowList: false, // Навіть не додаємо до списку, якщо додаток відкритий
          shouldPlaySound: false,
          shouldSetBadge: false, // Не оновлюємо бейдж
        };
      }
      
      // Для iOS та локальних нотифікацій
      return {
        shouldShowAlert: false, // iOS - не показувати alert
        shouldShowBanner: false, // Android/iOS - не показувати банер
        shouldShowList: true, // Додаємо до списку для історії
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
    console.warn('Дозвіл на нотифікації не надано');
    return false;
  }

  // Для Android потрібен канал
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1F2C3D',
      sound: 'default',
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
    await updateDoc(userRef, {
      fcmToken: null,
      notificationsEnabled: false,
    });
  } catch (error) {
    console.error('Помилка видалення FCM token:', error);
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

