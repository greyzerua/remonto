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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { logoutUser } from '../services/auth';
import { formatDateShort } from '../utils/helpers';
import { removeEmail } from '../utils/secureStorage';

export default function SettingsScreen() {
  const { user, authUser, userData } = useAuth();

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Профіль</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{authUser?.email || 'Невідомо'}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Ім'я</Text>
          <Text style={styles.infoValue}>
            {userData?.displayName || authUser?.displayName || 'Не вказано'}
          </Text>
        </View>
        {userData?.createdAt && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Дата реєстрації</Text>
            <Text style={styles.infoValue}>
              {formatDateShort(userData.createdAt)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={[styles.button, styles.buttonDanger]} onPress={handleLogout}>
          <Text style={styles.buttonDangerText}>Вийти з акаунту</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  noGroupText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonSecondary: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonSecondaryText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDanger: {
    backgroundColor: '#ff3b30',
  },
  buttonDangerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

