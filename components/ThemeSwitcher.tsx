import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeSwitcher() {
  const { theme, themeMode, setThemeMode } = useTheme();

  const handleModeChange = async (mode: 'light' | 'dark' | 'auto') => {
    await setThemeMode(mode);
  };

  const styles = createStyles(theme.colors);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Тема</Text>
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[
            styles.option,
            themeMode === 'light' && styles.optionActive,
            { borderColor: theme.colors.border },
          ]}
          onPress={() => handleModeChange('light')}
          activeOpacity={0.7}
        >
          <View style={styles.optionContent}>
            <View style={[styles.iconContainer, { backgroundColor: '#FFD700' }]}>
              <Text style={styles.iconText}>☀️</Text>
            </View>
            <Text
              style={[
                styles.optionText,
                { color: theme.colors.text },
                themeMode === 'light' && styles.optionTextActive,
              ]}
            >
              Світла
            </Text>
          </View>
          {themeMode === 'light' && (
            <View style={[styles.checkmark, { backgroundColor: theme.colors.primary }]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.option,
            themeMode === 'dark' && styles.optionActive,
            { borderColor: theme.colors.border },
          ]}
          onPress={() => handleModeChange('dark')}
          activeOpacity={0.7}
        >
          <View style={styles.optionContent}>
            <View style={[styles.iconContainer, { backgroundColor: '#1a1a1a' }]}>
              <Text style={styles.iconText}>🌙</Text>
            </View>
            <Text
              style={[
                styles.optionText,
                { color: theme.colors.text },
                themeMode === 'dark' && styles.optionTextActive,
              ]}
            >
              Темна
            </Text>
          </View>
          {themeMode === 'dark' && (
            <View style={[styles.checkmark, { backgroundColor: theme.colors.primary }]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.option,
            themeMode === 'auto' && styles.optionActive,
            { borderColor: theme.colors.border },
          ]}
          onPress={() => handleModeChange('auto')}
          activeOpacity={0.7}
        >
          <View style={styles.optionContent}>
            <View style={[styles.iconContainer, { backgroundColor: '#6c6c6c' }]}>
              <Text style={styles.iconText}>⚙️</Text>
            </View>
            <Text
              style={[
                styles.optionText,
                { color: theme.colors.text },
                themeMode === 'auto' && styles.optionTextActive,
              ]}
            >
              Автоматично
            </Text>
          </View>
          {themeMode === 'auto' && (
            <View style={[styles.checkmark, { backgroundColor: theme.colors.primary }]} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      marginBottom: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 16,
      color: colors.text,
    },
    optionsContainer: {
      gap: 12,
    },
    option: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 2,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    optionActive: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    iconText: {
      fontSize: 20,
    },
    optionText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    optionTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    checkmark: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

