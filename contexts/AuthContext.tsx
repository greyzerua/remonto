import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChange, convertToAuthUser, getUserData, getCurrentUser } from '../services/auth';
import { AuthUser, User } from '../types';
import { saveEmail, removeEmail } from '../utils/secureStorage';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUsersByIds, subscribeToProjects } from '../services/firestore';
import { showWarningToast, showSuccessToast } from '../utils/toast';
import { getFCMToken, saveFCMTokenToFirestore, clearBadgeCountAndUpdateFirestore, syncBadgeCountFromFirestore, updateBadgeFromNotification } from '../services/fcmNotifications';
import * as Notifications from 'expo-notifications';
import { Project } from '../types';

const USERS_COLLECTION = 'users';

const AUTH_STORAGE_KEY = '@remonto:authUser';

interface AuthContextType {
  user: FirebaseUser | null;
  authUser: AuthUser | null;
  userData: User | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
  setRevokingAccessUserId: (userId: string | null) => void;
  setLeavingUserId: (userId: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const previousSharedUserIdsRef = useRef<string[]>([]);
  const revokingAccessUserIdsRef = useRef<Set<string>>(new Set());
  const leavingUserIdsRef = useRef<Set<string>>(new Set());
  const previousProjectsRef = useRef<Map<string, Project>>(new Map());
  const projectsInitCallCountRef = useRef(0);
  const updateProjectsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        let data = await getUserData(firebaseUser.uid);
        
        // Якщо документа користувача немає в Firestore, створюємо його
        // Це може статися, якщо користувач увійшов не через реєстрацію
        // або документ був видалений
        if (!data && firebaseUser.email) {
          try {
            const userData = {
              id: firebaseUser.uid,
              email: firebaseUser.email.toLowerCase(),
              emailLowercase: firebaseUser.email.toLowerCase(),
              displayName: firebaseUser.displayName || '',
              createdAt: new Date().toISOString(),
              sharedUsers: [],
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), userData);
            data = await getUserData(firebaseUser.uid);
          } catch (error) {
            console.error('Помилка створення документа користувача:', error);
          }
        }
        
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

  // Відстежуємо зміни в проектах для показу тостів про новий доступ (працює на всіх екранах)
  useEffect(() => {
    if (!user) {
      previousProjectsRef.current = new Map();
      projectsInitCallCountRef.current = 0;
      return;
    }

    // Скидаємо лічильник при зміні користувача (при вході)
    previousProjectsRef.current = new Map();
    projectsInitCallCountRef.current = 0;

    const unsubscribe = subscribeToProjects(user.uid, (updatedProjects) => {
      const currentProjectsMap = new Map(updatedProjects.map(p => [p.id, p]));
      const previousProjectsMap = previousProjectsRef.current;
      
      // subscribeToProjects викликає callback двічі при ініціалізації:
      // 1. Перший раз - для власних проектів (where('createdBy', '==', userId))
      // 2. Другий раз - для спільних проектів (where('members', 'array-contains', userId))
      // Після другого виклику вважаємо ініціалізацію завершеною
      if (projectsInitCallCountRef.current < 2) {
        previousProjectsRef.current = new Map(updatedProjects.map(p => [p.id, p]));
        projectsInitCallCountRef.current++;
        return;
      }
      
      // Показуємо тости тільки після завершення ініціалізації (після 2-х викликів)
      if (previousProjectsMap.size > 0) {
        // Знаходимо нові спільні проєкти (ті, до яких надали доступ)
        const newSharedProjects = updatedProjects.filter(project => {
          const isNew = !previousProjectsMap.has(project.id);
          const isShared = project.createdBy !== user.uid;
          return isNew && isShared;
        });

        if (newSharedProjects.length > 0) {
          // Групуємо проекти за власником
          const projectsByOwner = new Map<string, Project[]>();
          newSharedProjects.forEach(project => {
            const ownerId = project.createdBy;
            if (!projectsByOwner.has(ownerId)) {
              projectsByOwner.set(ownerId, []);
            }
            projectsByOwner.get(ownerId)!.push(project);
          });

          // Показуємо Toast для кожного власника
          projectsByOwner.forEach(async (projects, ownerId) => {
            try {
              const owners = await getUsersByIds([ownerId]);
              if (owners.length > 0) {
                const owner = owners[0];
                const projectsCount = projects.length;
                
                // Формуємо правильне слово для української мови
                let projectWord;
                const lastDigit = projectsCount % 10;
                const lastTwoDigits = projectsCount % 100;
                
                if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
                  projectWord = 'проєктів';
                } else if (lastDigit === 1) {
                  projectWord = 'проєкту';
                } else if (lastDigit >= 2 && lastDigit <= 4) {
                  projectWord = 'проєктів';
                } else {
                  projectWord = 'проєктів';
                }

                const message = `${owner.displayName || owner.email} надав вам доступ до ${projectsCount} ${projectWord}`;
                showSuccessToast(message, 'Доступ надано');
              }
            } catch (error) {
              console.error('Помилка отримання інформації про власника:', error);
            }
          });
        }

        // Знаходимо проєкти, з яких забрали доступ
        const revokedProjects: Project[] = [];
        previousProjectsMap.forEach((previousProject, projectId) => {
          if (!currentProjectsMap.has(projectId)) {
            if (previousProject.createdBy !== user.uid) {
              revokedProjects.push(previousProject);
            }
          }
        });

        if (revokedProjects.length > 0) {
          // Групуємо проекти за власником
          const projectsByOwner = new Map<string, Project[]>();
          revokedProjects.forEach(project => {
            const ownerId = project.createdBy;
            if (!projectsByOwner.has(ownerId)) {
              projectsByOwner.set(ownerId, []);
            }
            projectsByOwner.get(ownerId)!.push(project);
          });

          // Показуємо Toast для кожного власника
          projectsByOwner.forEach(async (projects, ownerId) => {
            // Перевіряємо, чи це самостійна відписка (користувач сам відписався)
            if (leavingUserIdsRef.current.has(ownerId)) {
              // Це самостійна відписка - не показуємо повідомлення про забору доступу
              // Повідомлення про самостійну відписку показується в SettingsScreen
              return;
            }
            
            try {
              const owners = await getUsersByIds([ownerId]);
              if (owners.length > 0) {
                const owner = owners[0];
                const projectsCount = projects.length;
                
                // Формуємо правильне слово для української мови
                let projectWord;
                const lastDigit = projectsCount % 10;
                const lastTwoDigits = projectsCount % 100;
                
                if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
                  projectWord = 'проєктів';
                } else if (lastDigit === 1) {
                  projectWord = 'проєкту';
                } else if (lastDigit >= 2 && lastDigit <= 4) {
                  projectWord = 'проєктів';
                } else {
                  projectWord = 'проєктів';
                }

                const message = `${owner.displayName || owner.email} забрав у вас доступ до ${projectsCount} ${projectWord}`;
                showWarningToast(message, 'Доступ скасовано');
              }
            } catch (error) {
              console.error('Помилка отримання інформації про власника:', error);
            }
          });
        }
      }
      
      // Оновлюємо попередній список проектів з затримкою, щоб зібрати всі зміни
      // Коли забирають доступ з кількох проектів, оновлення можуть приходити окремо
      // Використовуємо debounce, щоб дочекатися всіх оновлень перед оновленням previousProjectsRef
      if (projectsInitCallCountRef.current >= 2) {
        // Скасовуємо попередній таймер, якщо він є
        if (updateProjectsTimeoutRef.current) {
          clearTimeout(updateProjectsTimeoutRef.current);
        }
        
        // Встановлюємо новий таймер для оновлення previousProjectsRef
        updateProjectsTimeoutRef.current = setTimeout(() => {
          previousProjectsRef.current = new Map(updatedProjects.map(p => [p.id, p]));
          updateProjectsTimeoutRef.current = null;
        }, 300); // Затримка 300мс для збору всіх змін
      }
    });

    return () => {
      unsubscribe();
      // Очищаємо таймер при виході
      if (updateProjectsTimeoutRef.current) {
        clearTimeout(updateProjectsTimeoutRef.current);
        updateProjectsTimeoutRef.current = null;
      }
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

  // Обробка вхідних нотифікацій та синхронізація badge при старті додатку
  useEffect(() => {
    if (!user) return;

    // Синхронізуємо badge count з Firestore при старті додатку (для Android)
    // Це важливо, бо коли додаток закритий, badge не оновлюється
    const syncBadgeOnStart = async () => {
      try {
        await syncBadgeCountFromFirestore(user.uid);
      } catch (error) {
        console.error('Помилка синхронізації badge при старті:', error);
      }
    };
    syncBadgeOnStart();

    // Обробка нотифікацій, коли додаток на передньому плані або в фоні
    const notificationListener = Notifications.addNotificationReceivedListener(async (notification) => {
      const appState = AppState.currentState;
      
      // Оновлюємо badge з нотифікації (важливо для Android)
      await updateBadgeFromNotification(notification);
      
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
    const responseListener = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data;
      // Очищаємо badge count при натисканні на нотифікацію
      if (user) {
        await clearBadgeCountAndUpdateFirestore(user.uid);
      }
      // Навігація до потрібного екрану може бути додана тут
    });

    // Обробка нотифікацій, які прийшли коли додаток був закритий
    // Це важливо для Android, бо handleNotification не викликається коли додаток закритий
    const checkLastNotification = async () => {
      try {
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
          await updateBadgeFromNotification(lastResponse.notification);
        }
      } catch (error) {
        console.error('Помилка перевірки останньої нотифікації:', error);
      }
    };
    checkLastNotification();

    // Очищаємо badge count, коли додаток стає активним (користувач відкриває додаток)
    const appStateListener = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active' && user) {
        // Синхронізуємо badge з Firestore перед очищенням
        // (на випадок якщо прийшли нотифікації поки додаток був закритий)
        await syncBadgeCountFromFirestore(user.uid);
        // Очищаємо badge count при відкритті додатку
        await clearBadgeCountAndUpdateFirestore(user.uid);
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
      appStateListener.remove();
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

  const setLeavingUserId = (userId: string | null) => {
    if (userId) {
      leavingUserIdsRef.current.add(userId);
      // Очищаємо через затримку, щоб встигти обробити зміни в проектах
      setTimeout(() => {
        leavingUserIdsRef.current.delete(userId);
      }, 2000);
    } else {
      leavingUserIdsRef.current.clear();
    }
  };

  const value: AuthContextType = {
    user,
    authUser,
    userData,
    loading,
    refreshUserData,
    setRevokingAccessUserId,
    setLeavingUserId,
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

