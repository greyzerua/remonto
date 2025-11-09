import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  primaryText: string;
  danger: string;
  dangerText: string;
  card: string;
  shadow: string;
}

interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
}

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = '@remonto:themeMode';

const lightColors: ThemeColors = {
  background: '#F4F6FA',
  surface: '#FFFFFF',
  text: '#1A2433',
  textSecondary: '#5E6878',
  border: '#D3DAE6',
  primary: '#1F2C3D',
  primaryText: '#FFFFFF',
  danger: '#E34D4D',
  dangerText: '#FFFFFF',
  card: '#FFFFFF',
  shadow: 'rgba(31, 44, 61, 0.08)',
};

const darkColors: ThemeColors = {
  background: '#060A12',
  surface: '#060A12',
  text: '#E4EBF5',
  textSecondary: '#8CA0BC',
  border: '#1B2A3F',
  primary: '#2C3B53',
  primaryText: '#FFFFFF',
  danger: '#F87171',
  dangerText: '#0B101B',
  card: '#121E30',
  shadow: 'rgba(44, 59, 83, 0.35)',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [isLoading, setIsLoading] = useState(true);

  // Визначаємо, чи використовувати темну тему
  const isDark =
    themeMode === 'dark' || (themeMode === 'auto' && systemColorScheme === 'dark');

  const colors = isDark ? darkColors : lightColors;

  const theme: Theme = {
    mode: themeMode,
    colors,
    isDark,
  };

  // Завантажуємо збережену тему при завантаженні
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        setThemeModeState(
          savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'auto')
            ? (savedTheme as ThemeMode)
            : 'dark'
        );
      } catch (error) {
        console.error('Помилка завантаження теми:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Помилка збереження теми:', error);
    }
  };

  const toggleTheme = async () => {
    const newMode = isDark ? 'light' : 'dark';
    await setThemeMode(newMode);
  };

  const value: ThemeContextType = {
    theme,
    themeMode,
    setThemeMode,
    toggleTheme,
  };

  // Показуємо loading тільки якщо це критично
  if (isLoading) {
    return null; // Або можна показати loading indicator
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

