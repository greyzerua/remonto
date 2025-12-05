import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const getFirebaseConfig = () => {
  // Спочатку перевіряємо змінні оточення (для .env файлів)
  const fromEnv = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };

  // Якщо є конфігурація в app.json через expo-constants
  const fromAppConfig = Constants.expoConfig?.extra?.firebase;

  // Використовуємо конфігурацію з app.json або змінні оточення
  const config = fromAppConfig || fromEnv;

  // Перевіряємо, чи всі необхідні поля присутні
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => !config[field as keyof typeof config]);

  if (missingFields.length > 0) {
    throw new Error(
      `Missing Firebase configuration fields: ${missingFields.join(', ')}. ` +
      `Provide them via app.json (extra.firebase) or environment variables (EXPO_PUBLIC_FIREBASE_*).`
    );
  }

  return {
    apiKey: config.apiKey!,
    authDomain: config.authDomain!,
    projectId: config.projectId!,
    storageBucket: config.storageBucket!,
    messagingSenderId: config.messagingSenderId!,
    appId: config.appId!,
  };
};

// Firebase конфігурація
const firebaseConfig = getFirebaseConfig();

// Ініціалізація Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  // Використовуємо initializeAuth з AsyncStorage для персистентності в React Native
  // Це забезпечує збереження токенів між сесіями
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error: any) {
    // Якщо auth вже ініціалізовано, використовуємо getAuth
    if (error.code === 'auth/already-initialized') {
      auth = getAuth(app);
    } else {
      throw error;
    }
  }
  db = getFirestore(app);
} else {
  app = getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };

