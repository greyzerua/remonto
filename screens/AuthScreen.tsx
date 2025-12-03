import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerUser, loginUser, checkIfEmailExists } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getEmail, saveEmail } from '../utils/secureStorage';
import ClearableTextInput from '../components/ClearableTextInput';

// Створюємо схему з умовною валідацією для displayName
const createAuthSchema = (isLoginMode: boolean) => {
  const baseSchema = z.object({
    email: z
      .string({ required_error: 'Email обов\'язковий' })
      .trim()
      .min(1, 'Email обов\'язковий')
      .email('Введіть валідний email'),
    password: z
      .string({ required_error: 'Пароль обов\'язковий' })
      .trim()
      .min(6, 'Пароль повинен містити мінімум 6 символів'),
    displayName: z.string().optional(),
  });

  if (isLoginMode) {
    return baseSchema;
  }

  // Для реєстрації робимо displayName обов'язковим
  return baseSchema.extend({
    displayName: z
      .string({ required_error: 'Ім\'я обов\'язкове' })
      .trim()
      .min(1, 'Ім\'я обов\'язкове')
      .min(2, 'Ім\'я повинно містити мінімум 2 символи'),
  });
};

type AuthFormValues = {
  email: string;
  password: string;
  displayName?: string;
};

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [authError, setAuthError] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const { refreshUserData } = useAuth();
  const { theme } = useTheme();
  
  // Створюємо resolver динамічно залежно від режиму
  const resolver = useMemo(
    () => zodResolver(createAuthSchema(isLogin)),
    [isLogin]
  );
  
  const {
    control,
    handleSubmit: formHandleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    clearErrors,
    setError,
    trigger,
  } = useForm<AuthFormValues>({
    resolver,
    defaultValues: {
      email: savedEmail,
      password: '',
      displayName: '',
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const defaultBorderColor = theme.isDark
    ? 'rgba(140, 160, 188, 0.24)'
    : 'rgba(31, 44, 61, 0.12)';

  // Завантажуємо збережений email при відкритті екрану
  useEffect(() => {
    const initialize = async () => {
      try {
        // Завантажуємо збережений email з SecureStore
        const email = await getEmail();
        if (email) {
          setSavedEmail(email);
          setValue('email', email);
        }
      } catch (error) {
        console.error('Помилка ініціалізації:', error);
      }
    };
    initialize();
  }, [setValue]);
  
  // Оновлюємо email в формі при зміні savedEmail
  useEffect(() => {
    if (savedEmail) {
      setValue('email', savedEmail);
    }
  }, [savedEmail, setValue]);

  useEffect(() => {
    setPasswordVisible(false);
    clearErrors();
    setAuthError('');
    // Оновлюємо значення displayName при зміні режиму
    setValue('displayName', '');
  }, [isLogin, clearErrors, setValue]);

  const handleSubmit = async (data: AuthFormValues) => {
    setAuthError('');
    const { email, password, displayName } = data;
    
    if (!isLogin) {
      const trimmedDisplayName = displayName?.trim() || '';
      
      try {
        const emailExists = await checkIfEmailExists(email);
        if (emailExists) {
          setError('email', {
            type: 'manual',
            message: 'Цей email вже зареєстрований',
          });
          return;
        }
      } catch (error) {
        setAuthError('Не вдалося перевірити email. Спробуйте пізніше.');
        return;
      }

      try {
        const normalizedEmail = email.trim().toLowerCase();
        await registerUser(normalizedEmail, password, trimmedDisplayName);
        await refreshUserData();
        // Зберігаємо нормалізований email в SecureStore (без пароля!)
        await saveEmail(normalizedEmail);
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          setError('email', {
            type: 'manual',
            message: 'Цей email вже зареєстрований',
          });
        } else if (error.code === 'auth/invalid-email') {
          setError('email', {
            type: 'manual',
            message: 'Невірний формат email',
          });
        } else if (error.code === 'auth/weak-password') {
          setError('password', {
            type: 'manual',
            message: 'Пароль занадто слабкий',
          });
        }
        setAuthError('Сталася помилка. Перевірте введені дані та спробуйте ще раз.');
        return;
      }
    } else {
      try {
        const normalizedEmail = email.trim().toLowerCase();
        await loginUser(normalizedEmail, password);
        // Зберігаємо нормалізований email в SecureStore (без пароля!)
        await saveEmail(normalizedEmail);
      } catch (error: any) {
        if (error.code === 'auth/invalid-email') {
          setError('email', {
            type: 'manual',
            message: 'Невірний формат email',
          });
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          setError('email', {
            type: 'manual',
            message: 'Невірний email або пароль',
          });
          setError('password', {
            type: 'manual',
            message: 'Невірний email або пароль',
          });
        } else if (error.code === 'auth/wrong-password') {
          setError('password', {
            type: 'manual',
            message: 'Невірний пароль',
          });
        }
        setAuthError('Сталася помилка. Перевірте введені дані та спробуйте ще раз.');
        return;
      }
    }
    
    clearErrors();
  };

  const styles = createStyles(theme.colors);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/transparent-logo.png')}
                style={styles.logo}
                resizeMode="cover"
              />
            </View>
            {!isLogin && (
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Ім'я</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: errors.displayName ? theme.colors.danger : defaultBorderColor,
                      shadowColor: theme.colors.shadow,
                    },
                  ]}
                >
                  <Controller
                    control={control}
                    name="displayName"
                    rules={{
                      required: !isLogin ? 'Ім\'я обов\'язкове' : false,
                      minLength: !isLogin ? { value: 2, message: 'Ім\'я повинно містити мінімум 2 символи' } : undefined,
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <ClearableTextInput
                        containerStyle={{ flex: 1 }}
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder="Як до вас звертатися?"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={value ?? ''}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        autoCapitalize="words"
                        editable={!isSubmitting}
                      />
                    )}
                  />
                </View>
                {errors.displayName?.message ? (
                  <Text style={styles.errorText}>{errors.displayName.message}</Text>
                ) : null}
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Email</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: errors.email ? theme.colors.danger : defaultBorderColor,
                    shadowColor: theme.colors.shadow,
                  },
                ]}
              >
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ClearableTextInput
                      containerStyle={{ flex: 1 }}
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholder="you@remonto.com"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      editable={!isSubmitting}
                    />
                  )}
                />
              </View>
              {errors.email?.message ? (
                <Text style={styles.errorText}>{errors.email.message}</Text>
              ) : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Пароль</Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: errors.password ? theme.colors.danger : defaultBorderColor,
                    shadowColor: theme.colors.shadow,
                  },
                ]}
              >
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ClearableTextInput
                    containerStyle={{ flex: 1 }}
                    style={[styles.input, { color: theme.colors.text }]}
                    placeholder={isLogin ? 'Уведіть пароль' : 'Створіть надійний пароль'}
                    placeholderTextColor={theme.colors.textSecondary}
                    value={value ?? ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry={!passwordVisible}
                    autoCapitalize="none"
                    autoComplete="password"
                    textContentType="password"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                )}
              />
              <TouchableOpacity
                onPress={() => setPasswordVisible(prev => !prev)}
                disabled={isSubmitting}
                style={styles.inputToggle}
                accessibilityRole="button"
                accessibilityLabel={passwordVisible ? 'Сховати пароль' : 'Показати пароль'}
                accessibilityHint="Подвійним торканням перемкніть видимість пароля"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons
                  name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
              </View>
              {errors.password?.message ? (
                <Text style={styles.errorText}>{errors.password.message}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: theme.colors.primary },
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={formHandleSubmit(handleSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={theme.colors.primaryText} />
              ) : (
                <Text style={[styles.buttonText, { color: theme.colors.primaryText }]}>
                  {isLogin ? 'Увійти' : 'Зареєструватися'}
                </Text>
              )}
            </TouchableOpacity>
            {authError ? <Text style={[styles.errorText, styles.formError]}>{authError}</Text> : null}

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsLogin(!isLogin)}
              disabled={isSubmitting}
            >
              <Text style={[styles.switchText, { color: theme.colors.primary }]}>
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

const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingVertical: 48,
    },
    content: {
      padding: 20,
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
    },
    title: {
      fontSize: 30,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    subtitle: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 30,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 10,
    },
    logo: {
      width: 350,
      height: 120,
    }, 
    inputContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
    },
    inputWrapper: {
      borderRadius: 18,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 4,
      minHeight: 56,
      justifyContent: 'flex-start',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      ...Platform.select({
        android: {
          elevation: 6,
        },
      }),
    },
    input: {
      fontSize: 16,
      flex: 1,
      paddingVertical: 14,
    },
    inputToggle: {
      marginLeft: 12,
      paddingVertical: 6,
      paddingHorizontal: 2,
    },
    button: {
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      marginTop: 10,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    switchButton: {
      marginTop: 20,
      alignItems: 'center',
    },
    switchText: {
      fontSize: 14,
    },
    errorText: {
      marginTop: 6,
      fontSize: 13,
      color: colors.danger,
    },
    formError: {
      textAlign: 'center',
    },
  });

