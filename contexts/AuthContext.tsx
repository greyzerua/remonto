import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChange, convertToAuthUser, getUserData, getCurrentUser } from '../services/auth';
import { AuthUser, User } from '../types';
import { saveEmail, removeEmail } from '../utils/secureStorage';

const AUTH_STORAGE_KEY = '@remonto:authUser';

interface AuthContextType {
  user: FirebaseUser | null;
  authUser: AuthUser | null;
  userData: User | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
      
      console.log('handleAuthState викликано:', firebaseUser ? firebaseUser.uid : 'null');
      
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
        console.log('Знайдено користувача при ініціалізації:', currentUser.uid);
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
      
      console.log('Додаткова перевірка через 1 секунду');
      const currentUser = getCurrentUser();
      
      if (currentUser && isMounted) {
        console.log('Знайдено користувача при додатковій перевірці:', currentUser.uid);
        await handleAuthState(currentUser);
      } else if (isMounted) {
        console.log('Користувача не знайдено при додатковій перевірці');
        setLoading(false);
      }
    };

    checkAuthStateDelayed();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const authUser = convertToAuthUser(user);

  const value: AuthContextType = {
    user,
    authUser,
    userData,
    loading,
    refreshUserData,
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

