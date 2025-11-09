import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User, AuthUser } from '../types';

/**
 * Реєстрація нового користувача
 */
export async function registerUser(
  email: string,
  password: string,
  displayName?: string
): Promise<FirebaseUser> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Оновлюємо профіль з ім'ям
    if (displayName) {
      await updateProfile(user, { displayName });
    }

    // Створюємо документ користувача в Firestore
    // Виключаємо поля з undefined значеннями (Firestore не підтримує undefined)
    const userData: Partial<User> = {
      id: user.uid,
      email: user.email || email,
      createdAt: new Date().toISOString(),
    };

    // Додаємо опціональні поля тільки якщо вони існують
    if (displayName) {
      userData.displayName = displayName;
    }
    if (user.photoURL) {
      userData.photoURL = user.photoURL;
    }

    await setDoc(doc(db, 'users', user.uid), userData);

    return user;
  } catch (error: any) {
    if (error?.code !== 'auth/email-already-in-use') {
      console.error('Помилка реєстрації:', error);
    }
    throw error;
  }
}

export async function checkIfEmailExists(email: string): Promise<boolean> {
  try {
    const signInMethods = await fetchSignInMethodsForEmail(auth, email);
    return signInMethods.length > 0;
  } catch (error) {
    console.error('Помилка перевірки email:', error);
    throw error;
  }
}

/**
 * Вхід користувача
 */
export async function loginUser(email: string, password: string): Promise<FirebaseUser> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error('Помилка входу:', error);
    throw error;
  }
}

/**
 * Вихід користувача
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Помилка виходу:', error);
    throw error;
  }
}

/**
 * Отримати поточного користувача
 */
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

/**
 * Підписка на зміни стану аутентифікації
 */
export function onAuthStateChange(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Конвертувати Firebase User в AuthUser
 */
export function convertToAuthUser(user: FirebaseUser | null): AuthUser | null {
  if (!user) return null;

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

/**
 * Отримати дані користувача з Firestore
 */
export async function getUserData(uid: string): Promise<User | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() } as User;
    }
    return null;
  } catch (error) {
    console.error('Помилка отримання даних користувача:', error);
    return null;
  }
}

