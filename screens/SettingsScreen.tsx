import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { logoutUser } from '../services/auth';
import { formatDateShort } from '../utils/helpers';
import { removeEmail } from '../utils/secureStorage';

export default function SettingsScreen() {
  const { user, authUser, userData } = useAuth();
  const { theme } = useTheme();

  const handleLogout = () => {
    Alert.alert('Вихід', 'Ви впевнені, що хочете вийти?', [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Вийти',
        style: 'destructive',
        onPress: async () => {
          await logoutUser();
          // Очищаємо збережений email (паролів не зберігаємо!)
          try {
            await removeEmail();
          } catch (error) {
            console.error('Помилка очищення даних входу:', error);
          }
        },
      },
    ]);
  };

  const styles = createStyles(theme.colors);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={[styles.contentContainer, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.contentInner}>
          <View style={styles.contentBody}>
            <View style={[styles.header]}>
              <Text style={[styles.title, { color: theme.colors.text }]}>Профіль</Text>
            </View>

            <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
              <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>{authUser?.email || 'Невідомо'}</Text>
              </View>
              <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Ім'я</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                  {userData?.displayName || authUser?.displayName || 'Не вказано'}
                </Text>
              </View>
              {userData?.createdAt && (
                <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Дата реєстрації</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {formatDateShort(userData.createdAt)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.section, styles.footerSection]}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.danger }]}
              onPress={handleLogout}
            >
              <Text style={[styles.buttonDangerText, { color: theme.colors.dangerText }]}>
                Вийти з акаунту
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      flex: 1,
    },
    contentContainer: {
      flexGrow: 1,
    },
    contentInner: {
      flexGrow: 1,
    },
    contentBody: {
      paddingTop: 20,
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    section: {
      paddingHorizontal: 20,
      paddingTop: 24,
    },
    footerSection: {
      borderBottomWidth: 0,
      marginTop: 'auto',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 16,
    },
    infoCard: {
      padding: 16,
      borderRadius: 8,
      marginBottom: 12,
      borderWidth: 1,
    },
    infoLabel: {
      fontSize: 12,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    infoValue: {
      fontSize: 16,
      fontWeight: '500',
    },
    noGroupText: {
      fontSize: 14,
      fontStyle: 'italic',
    },
    button: {
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonSecondary: {
      borderWidth: 1,
    },
    buttonSecondaryText: {
      fontSize: 16,
      fontWeight: '600',
    },
    buttonDangerText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });

