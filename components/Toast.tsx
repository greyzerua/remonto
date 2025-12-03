import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Кастомний Toast компонент з підтримкою тем
 */
export default function ToastComponent() {
  const { theme } = useTheme();

  return (
    <Toast
      config={{
        success: ({ text1, text2 }) => (
          <ToastBase
            title={text1}
            message={text2}
            icon="checkmark-circle"
            backgroundColor={theme.isDark ? '#10B981' : '#059669'}
            iconColor="#FFFFFF"
            theme={theme}
          />
        ),
        error: ({ text1, text2 }) => (
          <ToastBase
            title={text1}
            message={text2}
            icon="close-circle"
            backgroundColor={theme.colors.danger}
            iconColor={theme.colors.dangerText}
            theme={theme}
          />
        ),
        info: ({ text1, text2 }) => (
          <ToastBase
            title={text1}
            message={text2}
            icon="information-circle"
            backgroundColor={theme.isDark ? '#3B82F6' : '#2563EB'}
            iconColor="#FFFFFF"
            theme={theme}
          />
        ),
        warning: ({ text1, text2 }) => (
          <ToastBase
            title={text1}
            message={text2}
            icon="warning"
            backgroundColor={theme.isDark ? '#F59E0B' : '#D97706'}
            iconColor="#FFFFFF"
            theme={theme}
          />
        ),
      }}
    />
  );
}

interface ToastBaseProps {
  title?: string;
  message?: string;
  icon: string;
  backgroundColor: string;
  iconColor: string;
  theme: any;
}

function ToastBase({ title, message, icon, backgroundColor, iconColor, theme }: ToastBaseProps) {

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: backgroundColor,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginHorizontal: 16,
      marginTop: 8,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      minHeight: 56,
    },
    iconContainer: {
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
      marginBottom: 2,
    },
    message: {
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.9)',
      lineHeight: 18,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon as any} size={24} color={iconColor} />
      </View>
      <View style={styles.textContainer}>
        {title && <Text style={styles.title}>{title}</Text>}
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    </View>
  );
}

