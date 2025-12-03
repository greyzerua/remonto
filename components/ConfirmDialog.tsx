import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'Підтвердити',
  cancelText = 'Скасувати',
  type = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { theme } = useTheme();

  const getIconAndColor = () => {
    switch (type) {
      case 'danger':
        return {
          icon: 'warning',
          iconColor: theme.colors.danger,
          confirmButtonColor: theme.colors.danger,
          confirmButtonTextColor: theme.colors.dangerText,
        };
      case 'warning':
        return {
          icon: 'alert-circle',
          iconColor: theme.isDark ? '#F59E0B' : '#D97706',
          confirmButtonColor: theme.isDark ? '#F59E0B' : '#D97706',
          confirmButtonTextColor: '#FFFFFF',
        };
      default:
        return {
          icon: 'information-circle',
          iconColor: theme.colors.primary,
          confirmButtonColor: theme.colors.primary,
          confirmButtonTextColor: theme.colors.primaryText,
        };
    }
  };

  const { icon, iconColor, confirmButtonColor, confirmButtonTextColor } = getIconAndColor();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={['bottom']} style={[styles.content, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.iconContainer}>
              <View style={[styles.iconCircle, { backgroundColor: iconColor + '20' }]}>
                <Ionicons name={icon as any} size={32} color={iconColor} />
              </View>
            </View>

            <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
            <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>

            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  { borderColor: theme.colors.border, backgroundColor: theme.colors.background, marginRight: 6 },
                ]}
                onPress={onCancel}
              >
                <Text 
                  style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {cancelText}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.confirmButton,
                  { backgroundColor: confirmButtonColor, marginLeft: 6 },
                ]}
                onPress={onConfirm}
              >
                <Text 
                  style={[styles.confirmButtonText, { color: confirmButtonTextColor }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  content: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
    // backgroundColor встановлюється динамічно
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

