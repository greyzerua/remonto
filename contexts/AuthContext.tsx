import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChange, convertToAuthUser, getUserData, getCurrentUser } from '../services/auth';
import { AuthUser, User } from '../types';
import { saveEmail, removeEmail } from '../utils/secureStorage';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUsersByIds } from '../services/firestore';
import { showWarningToast, showSuccessToast } from '../utils/toast';
import { getFCMToken, saveFCMTokenToFirestore } from '../services/fcmNotifications';
import * as Notifications from 'expo-notifications';

const USERS_COLLECTION = 'users';

const AUTH_STORAGE_KEY = '@remonto:authUser';

interface AuthContextType {
  user: FirebaseUser | null;
  authUser: AuthUser | null;
  userData: User | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
  setRevokingAccessUserId: (userId: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const previousSharedUserIdsRef = useRef<string[]>([]);
  const revokingAccessUserIdsRef = useRef<Set<string>>(new Set());

  const refreshUserData = async () => {
    if (user) {
      const data = await getUserData(user.uid);
      setUserData(data);
    } else {
      setUserData(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let authStateHandled = false;

    // Функція для обробки стану користувача
    // Firebase Auth автоматично зберігає токени і відновлює сесію
    const handleAuthState = async (firebaseUser: FirebaseUser | null) => {
      if (!isMounted) return;
      
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Користувач авторизований
        const data = await getUserData(firebaseUser.uid);
        if (isMounted) {
          setUserData(data);
          // Зберігаємо інформацію про користувача
          try {
            await AsyncStorage.setItem(AUTH_STORAGE_KEY, firebaseUser.uid);
            // Зберігаємо email в SecureStore
            if (firebaseUser.email) {
              await saveEmail(firebaseUser.email);
            }
          } catch (error) {
            console.error('Помилка збереження стану аутентифікації:', error);
          }
        }
      } else {
        // Користувач не авторизований
        setUserData(null);
        try {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        } catch (error) {
          console.error('Помилка очищення стану аутентифікації:', error);
        }
      }
      
      if (isMounted) {
        authStateHandled = true;
        setLoading(false);
      }
    };

    // Спочатку перевіряємо поточного користувача одразу
    // Це допомагає відновити сесію швидше
    const checkInitialAuth = async () => {
      // Даємо Firebase трохи часу на ініціалізацію
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const currentUser = getCurrentUser();
      if (currentUser && isMounted && !authStateHandled) {
        await handleAuthState(currentUser);
      }
    };

    // Перевіряємо одразу
    checkInitialAuth();

    // Підписуємось на зміни стану аутентифікації
    // Firebase Auth автоматично відновлює сесію через onAuthStateChanged
    // якщо токен валідний
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (!isMounted) return;
      
      await handleAuthState(firebaseUser);
    });

    // Додаткова перевірка через затримку (на випадок якщо onAuthStateChanged не спрацював)
    const checkAuthStateDelayed = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      if (!isMounted || authStateHandled) return;
      
      const currentUser = getCurrentUser();
      
      if (currentUser && isMounted) {
        await handleAuthState(currentUser);
      } else if (isMounted) {
        setLoading(false);
      }
    };

    checkAuthStateDelayed();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Підписуємось на зміни документа користувача для автоматичного оновлення userData
  useEffect(() => {
    if (!user) {
      setUserData(null);
      previousSharedUserIdsRef.current = [];
      return;
    }

    const userDocRef = doc(db, USERS_COLLECTION, user.uid);
    
    // Спочатку завантажуємо поточні дані для ініціалізації ref
    const initializeUserData = async () => {
      try {
        const data = await getUserData(user.uid);
        if (data) {
          previousSharedUserIdsRef.current = data.sharedUsers || [];
        } else {
          previousSharedUserIdsRef.current = [];
        }
      } catch (error) {
        console.error('Помилка ініціалізації даних користувача:', error);
        previousSharedUserIdsRef.current = [];
      }
    };
    
    initializeUserData();
    
    const unsubscribeUserData = onSnapshot(
      userDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = { id: docSnapshot.id, ...docSnapshot.data() } as User;
          setUserData(data);
        } else {
          setUserData(null);
          previousSharedUserIdsRef.current = [];
        }
      },
      (error) => {
        console.error('Помилка підписки на зміни користувача:', error);
        // У разі помилки завантажуємо дані вручну
        refreshUserData();
      }
    );

    return () => {
      unsubscribeUserData();
    };
  }, [user]);

  // Відстежуємо зміни в sharedUsers для показу тостів про надання/відписку доступу (працює на всіх екранах)
  useEffect(() => {
    const currentSharedUserIds = userData?.sharedUsers || [];
    
    // Якщо це перше завантаження (попередній список порожній), просто зберігаємо поточний
    if (previousSharedUserIdsRef.current.length === 0) {
      previousSharedUserIdsRef.current = currentSharedUserIds;
      return;
    }
    
    // Знаходимо користувачів, які додалися до списку (надали доступ)
    const subscribedUserIds = currentSharedUserIds.filter(
      id => !previousSharedUserIdsRef.current.includes(id)
    );

    // Знаходимо користувачів, які видалилися зі списку (відписалися)
    // Виключаємо тих, для кого власник забирав доступ
    const unsubscribedUserIds = previousSharedUserIdsRef.current.filter(
      id => !currentSharedUserIds.includes(id) && !revokingAccessUserIdsRef.current.has(id)
    );

    // Показуємо тост та відправляємо нотифікацію для кожного користувача, який надав доступ
    if (subscribedUserIds.length > 0) {
      subscribedUserIds.forEach(async (subscribedUserId) => {
        try {
          const subscribedUsers = await getUsersByIds([subscribedUserId]);
          if (subscribedUsers.length > 0) {
            const subscribedUser = subscribedUsers[0];
            const message = `${subscribedUser.displayName || subscribedUser.email} надав вам доступ до своїх проєктів`;
            
            // Показуємо Toast (Cloud Functions автоматично відправлять push-нотифікацію)
            showSuccessToast(message, 'Доступ надано');
          }
        } catch (error) {
          console.error('Помилка отримання інформації про користувача:', error);
        }
      });
    }

    // Показуємо тост та відправляємо нотифікацію для кожного користувача, який відписався
    if (unsubscribedUserIds.length > 0) {
      unsubscribedUserIds.forEach(async (unsubscribedUserId) => {
        try {
          const unsubscribedUsers = await getUsersByIds([unsubscribedUserId]);
          if (unsubscribedUsers.length > 0) {
            const unsubscribedUser = unsubscribedUsers[0];
            const message = `${unsubscribedUser.displayName || unsubscribedUser.email} відписався від вас`;
            
            // Показуємо Toast
            showWarningToast(message, 'Відписка');
          }
        } catch (error) {
          console.error('Помилка отримання інформації про користувача:', error);
        }
      });
    }

    // Оновлюємо попередній список
    previousSharedUserIdsRef.current = currentSharedUserIds;
    
    // Очищаємо список користувачів, для яких забирали доступ (після обробки змін)
    // Використовуємо setTimeout, щоб переконатися, що всі зміни оброблені
    if (revokingAccessUserIdsRef.current.size > 0) {
      setTimeout(() => {
        revokingAccessUserIdsRef.current.clear();
      }, 1000);
    }
  }, [userData?.sharedUsers]);

  // Реєстрація FCM токену при авторизації користувача
  useEffect(() => {
    if (!user) {
      return;
    }

    let isMounted = true;

    const registerFCMToken = async () => {
      try {
        const token = await getFCMToken();
        if (token && isMounted) {
          await saveFCMTokenToFirestore(user.uid, token);
        }
      } catch (error) {
        console.error('Помилка реєстрації FCM token:', error);
      }
    };

    registerFCMToken();

    // Слухаємо зміни токену (наприклад, при оновленні)
    const tokenListener = Notifications.addPushTokenListener(async (tokenData) => {
      if (isMounted && user) {
        try {
          await saveFCMTokenToFirestore(user.uid, tokenData.data);
        } catch (error) {
          console.error('Помилка оновлення FCM token:', error);
        }
      }
    });

    return () => {
      isMounted = false;
      tokenListener.remove();
    };
  }, [user]);

  // Обробка вхідних нотифікацій
  useEffect(() => {
    if (!user) return;

    // Обробка нотифікацій, коли додаток на передньому плані
    const notificationListener = Notifications.addNotificationReceivedListener(async (notification) => {
      const appState = AppState.currentState;
      
      // Якщо додаток на передньому плані, негайно приховуємо нотифікацію програмно
      if (appState === 'active') {
        try {
          // Приховуємо конкретну нотифікацію
          await Notifications.dismissNotificationAsync(notification.request.identifier);
        } catch (error) {
          // Якщо не вдалося приховати конкретну, спробуємо приховати всі
          try {
            await Notifications.dismissAllNotificationsAsync();
          } catch (dismissAllError) {
            // Ігноруємо помилки приховування
          }
        }
      }
    });

    // Обробка натискання на нотифікацію
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      // Навігація до потрібного екрану може бути додана тут
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [user]);

  const authUser = convertToAuthUser(user);

  const setRevokingAccessUserId = (userId: string | null) => {
    if (userId) {
      revokingAccessUserIdsRef.current.add(userId);
    } else {
      revokingAccessUserIdsRef.current.clear();
    }
  };

  const value: AuthContextType = {
    user,
    authUser,
    userData,
    loading,
    refreshUserData,
    setRevokingAccessUserId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

