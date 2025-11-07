import * as SecureStore from 'expo-secure-store';

// SecureStore вимагає ключі тільки з alphanumeric символів, ".", "-", "_"
const AUTH_EMAIL_KEY = 'remonto_authEmail';

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


