import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { registerUser, loginUser } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { getEmail, saveEmail } from '../utils/secureStorage';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const { refreshUserData } = useAuth();

  // Завантажуємо збережений email при відкритті екрану
  useEffect(() => {
    const initialize = async () => {
      try {
        // Завантажуємо збережений email з SecureStore
        const savedEmail = await getEmail();
        if (savedEmail) {
          setEmail(savedEmail);
        }
      } catch (error) {
        console.error('Помилка ініціалізації:', error);
      } finally {
        setInitializing(false);
      }
    };
    initialize();
  }, []);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Помилка', 'Будь ласка, заповніть всі поля');
      return;
    }

    if (!isLogin && !displayName.trim()) {
      Alert.alert('Помилка', 'Будь ласка, введіть ваше ім\'я');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Помилка', 'Пароль повинен містити мінімум 6 символів');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await loginUser(email.trim(), password);
        // Зберігаємо email в SecureStore (без пароля!)
        await saveEmail(email.trim());
      } else {
        await registerUser(email.trim(), password, displayName.trim());
        await refreshUserData();
        // Зберігаємо email в SecureStore (без пароля!)
        await saveEmail(email.trim());
        // Пропонуємо увімкнути біометричну аутентифікацію
        if (biometricAvailable) {
          Alert.alert(
            'Біометрична аутентифікація',
            'Чи хочете увімкнути біометричну аутентифікацію для швидкого входу?',
            [
              { text: 'Пізніше', style: 'cancel' },
              {
                text: 'Увімкнути',
                onPress: async () => {
                  await setBiometricEnabled(true);
                  setBiometricEnabledState(true);
                },
              },
            ]
          );
        }
      }
    } catch (error: any) {
      let errorMessage = 'Сталася помилка';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Цей email вже використовується';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Невірний формат email';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'Користувача не знайдено';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Невірний пароль';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Пароль занадто слабкий';
      }
      Alert.alert('Помилка', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>🏠 Remonto</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Вхід до додатку' : 'Реєстрація нового користувача'}
          </Text>

          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Ім'я</Text>
              <TextInput
                style={styles.input}
                placeholder="Введіть ваше ім'я"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Пароль</Text>
            <TextInput
              style={styles.input}
              placeholder="Мінімум 6 символів"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'Увійти' : 'Зареєструватися'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsLogin(!isLogin)}
            disabled={loading}
          >
            <Text style={styles.switchText}>
              {isLogin
                ? 'Немає акаунту? Зареєструватися'
                : 'Вже є акаунт? Увійти'}
            </Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#007AFF',
    fontSize: 14,
  },
});

