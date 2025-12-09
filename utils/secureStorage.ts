import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// SecureStore вимагає ключі тільки з alphanumeric символів, ".", "-", "_"
const AUTH_EMAIL_KEY = 'remonto_authEmail';
const NOTIFICATIONS_ENABLED_KEY_PREFIX = '@remonto:notificationsEnabled:';

/**
 * Безпечне зберігання email користувача
 */
export async function saveEmail(email: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(AUTH_EMAIL_KEY, email);
  } catch (error) {
    console.error('Помилка збереження email:', error);
    throw error;
  }
}

/**
 * Отримання збереженого email
 */
export async function getEmail(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_EMAIL_KEY);
  } catch (error) {
    console.error('Помилка отримання email:', error);
    return null;
  }
}

/**
 * Видалення збереженого email
 */
export async function removeEmail(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(AUTH_EMAIL_KEY);
  } catch (error) {
    console.error('Помилка видалення email:', error);
  }
}

/**
 * Збереження стану нотифікацій в AsyncStorage для конкретного користувача
 */
export async function saveNotificationsEnabled(userId: string, enabled: boolean): Promise<void> {
  try {
    const key = `${NOTIFICATIONS_ENABLED_KEY_PREFIX}${userId}`;
    await AsyncStorage.setItem(key, JSON.stringify(enabled));
  } catch (error) {
    console.error('Помилка збереження стану нотифікацій:', error);
    throw error;
  }
}

/**
 * Отримання збереженого стану нотифікацій з AsyncStorage для конкретного користувача
 */
export async function getNotificationsEnabled(userId: string): Promise<boolean | null> {
  try {
    const key = `${NOTIFICATIONS_ENABLED_KEY_PREFIX}${userId}`;
    const value = await AsyncStorage.getItem(key);
    if (value === null) return null;
    return JSON.parse(value) as boolean;
  } catch (error) {
    console.error('Помилка отримання стану нотифікацій:', error);
    return null;
  }
}

/**
 * Видалення збереженого стану нотифікацій для конкретного користувача
 */
export async function removeNotificationsEnabled(userId: string): Promise<void> {
  try {
    const key = `${NOTIFICATIONS_ENABLED_KEY_PREFIX}${userId}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Помилка видалення стану нотифікацій:', error);
  }
}


