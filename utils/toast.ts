import Toast from 'react-native-toast-message';
import { useTheme } from '../contexts/ThemeContext';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
  onPress?: () => void;
}

/**
 * Показати Toast повідомлення
 */
export const showToast = ({ type = 'info', title, message, duration = 3000, onPress }: ToastOptions) => {
  Toast.show({
    type,
    text1: title,
    text2: message,
    visibilityTime: duration,
    onPress,
    position: 'top',
  });
};

/**
 * Показати успішне повідомлення
 */
export const showSuccessToast = (message: string, title?: string) => {
  showToast({ type: 'success', title: title || 'Успіх', message });
};

/**
 * Показати повідомлення про помилку
 */
export const showErrorToast = (message: string, title?: string) => {
  showToast({ type: 'error', title: title || 'Помилка', message });
};

/**
 * Показати інформаційне повідомлення
 */
export const showInfoToast = (message: string, title?: string) => {
  showToast({ type: 'info', title: title || 'Інформація', message });
};

/**
 * Показати попередження
 */
export const showWarningToast = (message: string, title?: string) => {
  showToast({ type: 'warning', title: title || 'Увага', message });
};

