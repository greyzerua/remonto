import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { logoutUser } from '../services/auth';
import { grantProjectAccessByEmail, revokeProjectAccess, getUsersByIds } from '../services/firestore';
import { formatDateShort } from '../utils/helpers';
import { removeEmail } from '../utils/secureStorage';
import ClearableTextInput from '../components/ClearableTextInput';
import { User } from '../types';

export default function SettingsScreen() {
  const { user, authUser, userData, refreshUserData } = useAuth();
  const { theme } = useTheme();
  const [sharedUsers, setSharedUsers] = useState<User[]>([]);
  const [sharedUsersLoading, setSharedUsersLoading] = useState(false);
  const [accessEmail, setAccessEmail] = useState('');
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSharedUsers = async () => {
      if (!userData?.sharedUsers || userData.sharedUsers.length === 0) {
        if (isMounted) {
          setSharedUsers([]);
          setSharedUsersLoading(false);
        }
        return;
      }

      if (isMounted) {
        setSharedUsersLoading(true);
      }

      try {
        const users = await getUsersByIds(userData.sharedUsers);
        if (isMounted) {
          setSharedUsers(users);
        }
      } catch (error) {
        console.error('Не вдалося завантажити користувачів з доступом:', error);
        if (isMounted) {
          Alert.alert('Помилка', 'Не вдалося завантажити список користувачів з доступом');
        }
      } finally {
        if (isMounted) {
          setSharedUsersLoading(false);
        }
      }
    };

    loadSharedUsers();

    return () => {
      isMounted = false;
    };
  }, [userData?.sharedUsers]);

  const handleGrantAccess = async () => {
    if (!user) {
      Alert.alert('Помилка', 'Поточний користувач не авторизований');
      return;
    }

    const trimmedEmail = accessEmail.trim();

    if (trimmedEmail.length === 0) {
      Alert.alert('Увага', 'Введіть email користувача');
      return;
    }

    setIsGrantingAccess(true);
    try {
      const grantedUser = await grantProjectAccessByEmail(user.uid, trimmedEmail);
      await refreshUserData();
      setAccessEmail('');
      Alert.alert(
        'Доступ надано',
        `Користувач ${grantedUser.displayName || grantedUser.email} отримав доступ до ваших проєктів`
      );
    } catch (error: any) {
      const message = error?.message || 'Не вдалося надати доступ. Спробуйте ще раз.';
      Alert.alert('Помилка', message);
    } finally {
      setIsGrantingAccess(false);
    }
  };

  const handleRevokeAccess = (member: User) => {
    if (!user) {
      Alert.alert('Помилка', 'Поточний користувач не авторизований');
      return;
    }

    Alert.alert(
      'Скасувати доступ',
      `Ви впевнені, що хочете скасувати доступ для користувача ${member.displayName || member.email}?`,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Скасувати доступ',
          style: 'destructive',
          onPress: async () => {
            setRemovingUserId(member.id);
            try {
              await revokeProjectAccess(user.uid, member.id);
              await refreshUserData();
            } catch (error: any) {
              const message = error?.message || 'Не вдалося скасувати доступ. Спробуйте ще раз.';
              Alert.alert('Помилка', message);
            } finally {
              setRemovingUserId(null);
            }
          },
        },
      ]
    );
  };

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
            </View>
          </View>

          <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Доступ до проєктів</Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
              Надайте доступ до своїх проєктів іншим користувачам за email. Вони зможуть працювати з вашими даними в
              режимі реального часу.
            </Text>

            <View
              style={[
                styles.shareInputContainer,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <ClearableTextInput
                value={accessEmail}
                onChangeText={setAccessEmail}
                placeholder="email@example.com"
                placeholderTextColor={theme.colors.textSecondary}
                style={[styles.shareInput, { color: theme.colors.text }]}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              <TouchableOpacity
                style={[
                  styles.shareButton,
                  {
                    backgroundColor: theme.colors.primary,
                  },
                  isGrantingAccess && styles.shareButtonDisabled,
                ]}
                onPress={handleGrantAccess}
                disabled={isGrantingAccess}
              >
                {isGrantingAccess ? (
                  <ActivityIndicator color={theme.colors.primaryText} />
                ) : (
                  <Text style={[styles.shareButtonText, { color: theme.colors.primaryText }]}>Надати доступ</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.sharedUsersList}>
              {sharedUsersLoading ? (
                <View style={styles.loadingSharedUsers}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text style={[styles.loadingSharedUsersText, { color: theme.colors.textSecondary }]}>
                    Завантаження...
                  </Text>
                </View>
              ) : sharedUsers.length === 0 ? (
                <Text style={[styles.emptySharedUsersText, { color: theme.colors.textSecondary }]}>
                  Ви ще не надали доступ жодному користувачу
                </Text>
              ) : (
                sharedUsers.map((member) => (
                  <View
                    key={member.id}
                    style={[
                      styles.sharedUserCard,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    ]}
                  >
                    <View style={styles.sharedUserInfo}>
                      <Text style={[styles.sharedUserName, { color: theme.colors.text }]}>
                        {member.displayName || member.email}
                      </Text>
                      <Text style={[styles.sharedUserEmail, { color: theme.colors.textSecondary }]}>
                        {member.email}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.revokeButton, { borderColor: theme.colors.danger }]}
                      onPress={() => handleRevokeAccess(member)}
                      disabled={removingUserId === member.id}
                    >
                      {removingUserId === member.id ? (
                        <ActivityIndicator color={theme.colors.danger} />
                      ) : (
                        <Text style={[styles.revokeButtonText, { color: theme.colors.danger }]}>Скасувати</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))
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
    sectionDescription: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 20,
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
    shareInputContainer: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      alignItems: 'stretch',
      marginBottom: 20,
    },
    shareInput: {
      fontSize: 16,
      paddingVertical: 8,
      marginBottom: 12,
      alignSelf: 'stretch',
    },
    shareButton: {
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'stretch',
    },
    shareButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    shareButtonDisabled: {
      opacity: 0.7,
    },
    sharedUsersList: {
      marginTop: 4,
    },
    sharedUserCard: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sharedUserInfo: {
      flex: 1,
    },
    sharedUserName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    sharedUserEmail: {
      fontSize: 14,
    },
    revokeButton: {
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    revokeButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    loadingSharedUsers: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    loadingSharedUsersText: {
      fontSize: 14,
      marginLeft: 12,
    },
    emptySharedUsersText: {
      fontSize: 14,
      fontStyle: 'italic',
    },
  });

