import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { logoutUser, updateDisplayName } from '../services/auth';
import { 
  grantProjectAccessByEmail, 
  revokeProjectAccess, 
  getUsersByIds, 
  getAllUsers,
  getOwnerProjects,
  grantProjectAccessToSelectedProjects,
  revokeProjectAccessFromSelectedProjects,
  subscribeToProjects,
  leaveUserAccess,
} from '../services/firestore';
import { writeBatch, doc, arrayRemove } from 'firebase/firestore';
import { db } from '../config/firebase';

const PROJECTS_COLLECTION = 'projects';
import { formatDateShort } from '../utils/helpers';
import { removeEmail } from '../utils/secureStorage';
import { showErrorToast, showSuccessToast, showWarningToast } from '../utils/toast';
import { useConfirmDialog } from '../contexts/ConfirmDialogContext';
import ClearableTextInput from '../components/ClearableTextInput';
import { User, Project } from '../types';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '../components/BottomSheet';

export default function SettingsScreen() {
  const { user, authUser, userData, refreshUserData, setRevokingAccessUserId } = useAuth();
  const { theme } = useTheme();
  const { showConfirm } = useConfirmDialog();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [sharedUsers, setSharedUsers] = useState<User[]>([]);
  const [sharedUsersLoading, setSharedUsersLoading] = useState(false);
  const [accessEmail, setAccessEmail] = useState('');
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allUsersLoading, setAllUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [usersBottomSheetVisible, setUsersBottomSheetVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [projectsBottomSheetVisible, setProjectsBottomSheetVisible] = useState(false);
  const [revokeProjectsBottomSheetVisible, setRevokeProjectsBottomSheetVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [ownerProjects, setOwnerProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [selectedProjectsToRevoke, setSelectedProjectsToRevoke] = useState<Set<string>>(new Set());
  const [isRevokingAccess, setIsRevokingAccess] = useState(false);
  const [sharedProjects, setSharedProjects] = useState<Project[]>([]);
  const [usersWhoGrantedAccess, setUsersWhoGrantedAccess] = useState<User[]>([]);
  const [leavingUserId, setLeavingUserId] = useState<string | null>(null);
  const bottomSheetSnapPoints = useMemo(
    () => [Platform.OS === 'ios' ? 0.85 : 0.9],
    []
  );
  const bottomSheetContentMaxHeight = useMemo(
    () => windowHeight * (Platform.OS === 'ios' ? 0.75 : 0.8),
    [windowHeight]
  );

  // Відстежуємо висоту клавіатури для iOS
  useEffect(() => {
    if (!usersBottomSheetVisible || Platform.OS !== 'ios') return;

    const keyboardWillShow = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [usersBottomSheetVisible]);

  useEffect(() => {
    const currentName = userData?.displayName || authUser?.displayName || '';
    setDisplayName(currentName);
  }, [userData?.displayName, authUser?.displayName]);

  useEffect(() => {
    let isMounted = true;

    const loadAllUsers = async () => {
      if (!user) return;

      if (isMounted) {
        setAllUsersLoading(true);
      }

      try {
        const users = await getAllUsers();
        // Виключаємо поточного користувача зі списку
        const filteredUsers = users.filter(u => u.id !== user.uid);
        if (isMounted) {
          setAllUsers(filteredUsers);
        }
      } catch (error) {
        console.error('Не вдалося завантажити користувачів:', error);
        if (isMounted) {
          showErrorToast('Не вдалося завантажити список користувачів');
        }
      } finally {
        if (isMounted) {
          setAllUsersLoading(false);
        }
      }
    };

    loadAllUsers();

    return () => {
      isMounted = false;
    };
  }, [user]);

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
          showErrorToast('Не вдалося завантажити список користувачів з доступом');
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

  // Завантажуємо спільні проекти та знаходимо користувачів, які надали доступ
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToProjects(user.uid, async (updatedProjects) => {
      // Фільтруємо тільки спільні проекти (ті, що не створені поточним користувачем)
      // І тільки ті, де користувач дійсно є членом
      const shared = updatedProjects.filter(p => 
        p.createdBy !== user.uid && 
        p.members?.includes(user.uid)
      );
      setSharedProjects(shared);
    });

    return () => unsubscribe();
  }, [user]);

  // Додаткова перевірка: якщо проекти зникли, одразу оновлюємо список користувачів
  // Це допомагає одразу оновити список, коли власник забирає доступ з усіх проектів
  // Використовуємо useMemo для обчислення списку власників на основі sharedProjects
  const computedUsersWhoGrantedAccess = useMemo(() => {
    if (!user || sharedProjects.length === 0) {
      return [];
    }

    // Знаходимо унікальних власників проектів
    const ownerIds = new Set<string>();
    sharedProjects.forEach(project => {
      if (project.members?.includes(user.uid)) {
        ownerIds.add(project.createdBy);
      }
    });

    return Array.from(ownerIds);
  }, [sharedProjects, user?.uid]);

  // Оновлюємо список користувачів на основі обчислених власників
  useEffect(() => {
    if (computedUsersWhoGrantedAccess.length === 0) {
      setUsersWhoGrantedAccess([]);
      return;
    }

    // Завантажуємо дані користувачів для обчислених власників
    getUsersByIds(computedUsersWhoGrantedAccess).then(owners => {
      setUsersWhoGrantedAccess(owners);
    });
  }, [computedUsersWhoGrantedAccess]);

  // Функція для відписки від користувача (видалити себе з members всіх його проектів)
  const handleLeaveUser = async (ownerUser: User) => {
    if (!user) {
      showErrorToast('Помилка авторизації');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Відписатися від користувача',
      message: `Ви впевнені, що хочете відписатися від користувача "${ownerUser.displayName || ownerUser.email}"? Ви втратите доступ до всіх його проєктів.`,
      confirmText: 'Відписатися',
      cancelText: 'Скасувати',
      type: 'danger',
    });

    if (!confirmed) return;

    setLeavingUserId(ownerUser.id);
    try {
      // Видаляємо себе зі списку sharedUsers власника та з members всіх його проектів
      await leaveUserAccess(ownerUser.id, user.uid);
      
      // Одразу оновлюємо список користувачів, видаляючи відписаного користувача
      setUsersWhoGrantedAccess(prev => prev.filter(u => u.id !== ownerUser.id));
      setSharedProjects(prev => prev.filter(p => p.createdBy !== ownerUser.id));
      
      showSuccessToast('Ви успішно відписалися від користувача');
    } catch (error: any) {
      const errorMessage = error?.message || 'Не вдалося відписатися від користувача';
      showErrorToast(errorMessage);
    } finally {
      setLeavingUserId(null);
    }
  };

  const handleGrantAccess = async () => {
    if (!user) {
      showErrorToast('Поточний користувач не авторизований');
      return;
    }

    const trimmedEmail = accessEmail.trim();

    if (trimmedEmail.length === 0) {
      showWarningToast('Введіть email користувача');
      return;
    }

    setIsGrantingAccess(true);
    try {
      const grantedUser = await grantProjectAccessByEmail(user.uid, trimmedEmail);
      await refreshUserData();
      setAccessEmail('');
      showSuccessToast(
        `Користувач ${grantedUser.displayName || grantedUser.email} отримав доступ до ваших проєктів`,
        'Доступ надано'
      );
    } catch (error: any) {
      const message = error?.message || 'Не вдалося надати доступ. Спробуйте ще раз.';
      showErrorToast(message);
    } finally {
      setIsGrantingAccess(false);
    }
  };

  const handleGrantAccessToUser = async (targetUser: User) => {
    if (!user) {
      showErrorToast('Поточний користувач не авторизований');
      return;
    }

    if (targetUser.id === user.uid) {
      showWarningToast('Ви не можете надати доступ собі');
      return;
    }

    // Відкриваємо модальне вікно для вибору проектів
    setSelectedUser(targetUser);
    setUsersBottomSheetVisible(false);
    setSearchQuery('');
    await loadOwnerProjects();
    setProjectsBottomSheetVisible(true);
  };

  const handleAddProjectsToUser = async (targetUser: User) => {
    if (!user) {
      showErrorToast('Поточний користувач не авторизований');
      return;
    }

    // Відкриваємо модальне вікно для вибору проектів
    setSelectedUser(targetUser);
    await loadOwnerProjects();
    setProjectsBottomSheetVisible(true);
  };

  const handleRevokeProjectsFromUser = async (targetUser: User) => {
    if (!user) {
      showErrorToast('Поточний користувач не авторизований');
      return;
    }

    // Завантажуємо проекти (не відмічаємо автоматично - користувач сам вибирає)
    setSelectedUser(targetUser);
    setSelectedProjectsToRevoke(new Set());
    setProjectsLoading(true);
    try {
      const projects = await getOwnerProjects(user.uid);
      setOwnerProjects(projects);
    } catch (error) {
      console.error('Не вдалося завантажити проєкти:', error);
      showErrorToast('Не вдалося завантажити список проєктів');
    } finally {
      setProjectsLoading(false);
    }
    
    setRevokeProjectsBottomSheetVisible(true);
  };

  const handleToggleRevokeProjectSelection = (projectId: string) => {
    const newSelected = new Set(selectedProjectsToRevoke);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjectsToRevoke(newSelected);
  };

  const handleConfirmRevokeProjects = async () => {
    if (!user || !selectedUser) {
      showErrorToast('Помилка: користувач не вибраний');
      return;
    }

    if (selectedProjectsToRevoke.size === 0) {
      showWarningToast('Виберіть хоча б один проєкт');
      return;
    }

    const projectsCount = selectedProjectsToRevoke.size;
    setIsRevokingAccess(true);
    try {
      // Вказуємо, що зараз забираємо доступ, щоб не показувати тост про відписку
      setRevokingAccessUserId(selectedUser.id);
      await revokeProjectAccessFromSelectedProjects(
        user.uid,
        selectedUser.id,
        Array.from(selectedProjectsToRevoke)
      );
      await refreshUserData();
      setRevokeProjectsBottomSheetVisible(false);
      setSelectedUser(null);
      setSelectedProjectsToRevoke(new Set());
      
      const message = `Доступ до ${projectsCount} проєкт${projectsCount === 1 ? 'у' : projectsCount < 5 ? 'ів' : 'ів'} забрано`;
      showSuccessToast(message, 'Доступ скасовано');
    } catch (error: any) {
      const message = error?.message || 'Не вдалося забрати доступ. Спробуйте ще раз.';
      showErrorToast(message);
      // Очищаємо ref у випадку помилки
      setRevokingAccessUserId(null);
    } finally {
      setIsRevokingAccess(false);
    }
  };

  const loadOwnerProjects = async (memberId?: string) => {
    if (!user) return;

    setProjectsLoading(true);
    try {
      const projects = await getOwnerProjects(user.uid);
      setOwnerProjects(projects);
      // Не відмічаємо автоматично - користувач сам вибирає проекти
      setSelectedProjectIds(new Set());
    } catch (error) {
      console.error('Не вдалося завантажити проєкти:', error);
      showErrorToast('Не вдалося завантажити список проєктів');
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleToggleProjectSelection = (projectId: string) => {
    const newSelected = new Set(selectedProjectIds);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjectIds(newSelected);
  };

  const handleConfirmProjectSelection = async () => {
    if (!user || !selectedUser) {
      showErrorToast('Помилка: користувач не вибраний');
      return;
    }

    if (selectedProjectIds.size === 0) {
      showWarningToast('Виберіть хоча б один проєкт');
      return;
    }

    setIsGrantingAccess(true);
    try {
      const result = await grantProjectAccessToSelectedProjects(
        user.uid,
        selectedUser.id,
        Array.from(selectedProjectIds)
      );
      await refreshUserData();
      setProjectsBottomSheetVisible(false);
      setSelectedUser(null);
      setSelectedProjectIds(new Set());
      
      if (result.added > 0) {
        const message = `Користувач ${selectedUser.displayName || selectedUser.email} отримав доступ до ${result.added} проєкт${result.added === 1 ? 'у' : result.added < 5 ? 'ів' : 'ів'}`;
        showSuccessToast(message, 'Доступ надано');
      } else {
        showWarningToast('Користувач вже має доступ до всіх вибраних проєктів');
      }
    } catch (error: any) {
      const message = error?.message || 'Не вдалося надати доступ. Спробуйте ще раз.';
      showErrorToast(message);
    } finally {
      setIsGrantingAccess(false);
    }
  };

  // Фільтруємо користувачів за пошуковим запитом
  const filteredAllUsers = allUsers.filter(u => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = (u.displayName || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const handleRevokeAccess = async (member: User) => {
    if (!user) {
      showErrorToast('Поточний користувач не авторизований');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Скасувати доступ',
      message: `Ви впевнені, що хочете скасувати доступ для користувача ${member.displayName || member.email}?`,
      confirmText: 'Скасувати доступ',
      cancelText: 'Відмінити',
      type: 'danger',
    });

    if (!confirmed) return;

    setRemovingUserId(member.id);
    try {
      // Вказуємо, що зараз забираємо доступ, щоб не показувати тост про відписку
      setRevokingAccessUserId(member.id);
      await revokeProjectAccess(user.uid, member.id);
      await refreshUserData();
      showSuccessToast(
        `Доступ для користувача ${member.displayName || member.email} скасовано`,
        'Доступ скасовано'
      );
    } catch (error: any) {
      const message = error?.message || 'Не вдалося скасувати доступ. Спробуйте ще раз.';
      showErrorToast(message);
      // Очищаємо ref у випадку помилки
      setRevokingAccessUserId(null);
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleSaveName = async () => {
    const trimmedName = displayName.trim();
    
    if (!trimmedName) {
      setNameError('Ім\'я не може бути порожнім');
      return;
    }
    
    if (trimmedName.length < 2) {
      setNameError('Ім\'я повинно містити мінімум 2 символи');
      return;
    }
    
    setIsUpdatingName(true);
    setNameError('');
    
    try {
      await updateDisplayName(trimmedName);
      await refreshUserData();
      setIsEditingName(false);
      showSuccessToast('Ім\'я успішно оновлено');
    } catch (error: any) {
      const message = error?.message || 'Не вдалося оновити ім\'я. Спробуйте ще раз.';
      setNameError(message);
      showErrorToast(message);
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleCancelEditName = () => {
    const currentName = userData?.displayName || authUser?.displayName || '';
    setDisplayName(currentName);
    setIsEditingName(false);
    setNameError('');
  };

  const handleLogout = async () => {
    const confirmed = await showConfirm({
      title: 'Вихід',
      message: 'Ви впевнені, що хочете вийти?',
      confirmText: 'Вийти',
      cancelText: 'Скасувати',
      type: 'warning',
    });

    if (!confirmed) return;

    await logoutUser();
    // Очищаємо збережений email (паролів не зберігаємо!)
    try {
      await removeEmail();
    } catch (error) {
      console.error('Помилка очищення даних входу:', error);
    }
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
              <View style={styles.headerSpacer} />
              <Text style={[styles.title, { color: theme.colors.text }]}>Профіль</Text>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="log-out-outline" size={27} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>

            <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
              <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>{authUser?.email || 'Невідомо'}</Text>
              </View>
              <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.nameHeader}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Ім'я</Text>
                  {!isEditingName && (
                    <TouchableOpacity
                      onPress={() => setIsEditingName(true)}
                      style={styles.editButton}
                      disabled={isUpdatingName}
                    >
                      <Ionicons name="pencil-outline" size={18} color={theme.colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
                {isEditingName ? (
                  <View>
                    <View
                      style={[
                        styles.nameInputWrapper,
                        {
                          backgroundColor: theme.colors.background,
                          borderColor: nameError ? theme.colors.danger : theme.colors.border,
                        },
                      ]}
                    >
                      <ClearableTextInput
                        value={displayName}
                        onChangeText={text => {
                          setDisplayName(text);
                          if (nameError) {
                            setNameError('');
                          }
                        }}
                        placeholder="Введіть ім'я"
                        placeholderTextColor={theme.colors.textSecondary}
                        style={[styles.nameInput, { color: theme.colors.text }]}
                        autoCapitalize="words"
                        editable={!isUpdatingName}
                        autoFocus
                      />
                    </View>
                    {nameError ? <Text style={styles.nameErrorText}>{nameError}</Text> : null}
                    <View style={styles.nameActions}>
                      <TouchableOpacity
                        onPress={handleCancelEditName}
                        style={[styles.nameActionButton, { borderColor: theme.colors.border }]}
                        disabled={isUpdatingName}
                      >
                        <Text style={[styles.nameActionButtonText, { color: theme.colors.textSecondary }]}>
                          Скасувати
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSaveName}
                        style={[
                          styles.nameActionButton,
                          styles.nameActionButtonPrimary,
                          { backgroundColor: theme.colors.primary },
                          isUpdatingName && styles.nameActionButtonDisabled,
                        ]}
                        disabled={isUpdatingName}
                      >
                        {isUpdatingName ? (
                          <ActivityIndicator color={theme.colors.primaryText} size="small" />
                        ) : (
                          <Text style={[styles.nameActionButtonText, { color: theme.colors.primaryText }]}>
                            Зберегти
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {userData?.displayName || authUser?.displayName || 'Не вказано'}
                  </Text>
                )}
              </View>
            </View>
          </View>

          <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Доступ до проєктів</Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
              Надайте доступ до своїх проєктів іншим користувачам. Вони зможуть працювати з вашими даними в
              режимі реального часу.
            </Text>

            <TouchableOpacity
              style={[
                styles.selectUserButton,
                {
                  backgroundColor: theme.colors.primary,
                  borderColor: theme.colors.primary,
                },
              ]}
              onPress={() => setUsersBottomSheetVisible(true)}
            >
              <Ionicons name="person-add-outline" size={20} color={theme.colors.primaryText} />
              <Text style={[styles.selectUserButtonText, { color: theme.colors.primaryText }]}>
                Вибрати користувача
              </Text>
            </TouchableOpacity>

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
                    <View style={styles.sharedUserActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, { borderColor: '#34C759' }]}
                        onPress={() => handleAddProjectsToUser(member)}
                        disabled={isGrantingAccess}
                      >
                        <Ionicons name="add-outline" size={16} color="#34C759" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { borderColor: '#FF9500' }]}
                        onPress={() => handleRevokeProjectsFromUser(member)}
                        disabled={isRevokingAccess}
                      >
                        <Ionicons name="remove-outline" size={16} color="#FF9500" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { borderColor: theme.colors.danger }]}
                        onPress={() => handleRevokeAccess(member)}
                        disabled={removingUserId === member.id}
                      >
                        {removingUserId === member.id ? (
                          <ActivityIndicator color={theme.colors.danger} size="small" />
                        ) : (
                          <Ionicons name="close-outline" size={16} color={theme.colors.danger} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Користувачі, які надали мені доступ</Text>
            <View style={styles.sharedUsersList}>
              {usersWhoGrantedAccess.length === 0 ? (
                <Text style={[styles.emptySharedUsersText, { color: theme.colors.textSecondary }]}>
                  Вам ще не надали доступ жодні користувачі
                </Text>
              ) : (
                usersWhoGrantedAccess.map((ownerUser) => {
                  const projectsCount = sharedProjects.filter(p => p.createdBy === ownerUser.id).length;
                  
                  return (
                    <View
                      key={ownerUser.id}
                      style={[
                        styles.sharedUserCard,
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      ]}
                    >
                      <View style={styles.sharedUserInfo}>
                        <Text style={[styles.sharedUserName, { color: theme.colors.text }]}>
                          {ownerUser.displayName || ownerUser.email}
                        </Text>
                        <Text style={[styles.sharedUserEmail, { color: theme.colors.textSecondary }]}>
                          {ownerUser.email}
                          {projectsCount > 0 && ` • ${projectsCount} проєкт${projectsCount === 1 ? '' : projectsCount < 5 ? 'и' : 'ів'}`}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.actionButton, { borderColor: theme.colors.danger }]}
                        onPress={() => handleLeaveUser(ownerUser)}
                        disabled={leavingUserId === ownerUser.id}
                      >
                        {leavingUserId === ownerUser.id ? (
                          <ActivityIndicator color={theme.colors.danger} size="small" />
                        ) : (
                          <Ionicons name="close-outline" size={16} color={theme.colors.danger} />
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          </View>

        </View>
      </ScrollView>

      <BottomSheet
        visible={usersBottomSheetVisible}
        onClose={() => {
          setUsersBottomSheetVisible(false);
          setSearchQuery('');
        }}
        enablePanDownToClose={true}
        enableBackdrop={true}
        backdropOpacity={0.5}
        snapPoints={bottomSheetSnapPoints}
      >
        <View style={styles.bottomSheetWrapper}>
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: bottomSheetContentMaxHeight }}
            contentContainerStyle={[
              styles.bottomSheetScrollContent,
              { 
                paddingBottom: insets.bottom + 24 + (Platform.OS === 'ios' ? keyboardHeight : 0),
              },
            ]}
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            <Text style={[styles.bottomSheetTitle, { color: theme.colors.text }]}>Вибрати користувача</Text>
            <Text style={[styles.bottomSheetDescription, { color: theme.colors.textSecondary }]}>
              Оберіть користувача зі списку або знайдіть за ім'ям або email
            </Text>

            <View
              style={[
                styles.searchInputContainer,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background,
                },
              ]}
            >
              <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
              <ClearableTextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Пошук за ім'ям або email..."
                placeholderTextColor={theme.colors.textSecondary}
                style={[styles.searchInput, { color: theme.colors.text }]}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.allUsersList}>
              {allUsersLoading ? (
                <View style={styles.loadingSharedUsers}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text style={[styles.loadingSharedUsersText, { color: theme.colors.textSecondary }]}>
                    Завантаження...
                  </Text>
                </View>
              ) : filteredAllUsers.length === 0 ? (
                <Text style={[styles.emptySharedUsersText, { color: theme.colors.textSecondary }]}>
                  {searchQuery ? 'Користувачів не знайдено' : 'Користувачів не знайдено'}
                </Text>
              ) : (
                filteredAllUsers.map((targetUser) => {
                  const hasAccess = userData?.sharedUsers?.includes(targetUser.id) || false;
                  return (
                    <TouchableOpacity
                      key={targetUser.id}
                      style={[
                        styles.allUserCard,
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                        hasAccess && { opacity: 0.6 },
                      ]}
                      onPress={() => {
                        if (!hasAccess) {
                          handleGrantAccessToUser(targetUser);
                          setUsersBottomSheetVisible(false);
                          setSearchQuery('');
                        }
                      }}
                      disabled={hasAccess || isGrantingAccess}
                    >
                      <View style={styles.allUserInfo}>
                        <Text style={[styles.allUserName, { color: theme.colors.text }]}>
                          {targetUser.displayName || targetUser.email}
                        </Text>
                        <Text style={[styles.allUserEmail, { color: theme.colors.textSecondary }]}>
                          {targetUser.email}
                        </Text>
                      </View>
                      {hasAccess ? (
                        <View style={[styles.accessBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                          <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                          <Text style={[styles.accessBadgeText, { color: theme.colors.primary }]}>Доступ надано</Text>
                        </View>
                      ) : (
                        <Ionicons name="chevron-forward-outline" size={20} color={theme.colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </BottomSheetScrollView>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={projectsBottomSheetVisible}
        onClose={() => {
          setProjectsBottomSheetVisible(false);
          setSelectedUser(null);
          setSelectedProjectIds(new Set());
        }}
        enablePanDownToClose={true}
        enableBackdrop={true}
        backdropOpacity={0.5}
        snapPoints={bottomSheetSnapPoints}
      >
        <View style={styles.bottomSheetWrapper}>
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: bottomSheetContentMaxHeight }}
            contentContainerStyle={[
              styles.bottomSheetScrollContent,
              { 
                paddingBottom: insets.bottom + 24,
              },
            ]}
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            <Text style={[styles.bottomSheetTitle, { color: theme.colors.text }]}>
              Виберіть проєкти для {selectedUser?.displayName || selectedUser?.email}
            </Text>
            <Text style={[styles.bottomSheetDescription, { color: theme.colors.textSecondary }]}>
              Оберіть проєкти, до яких ви хочете надати доступ користувачу
            </Text>

            <View style={styles.projectsList}>
              {projectsLoading ? (
                <View style={styles.loadingSharedUsers}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text style={[styles.loadingSharedUsersText, { color: theme.colors.textSecondary }]}>
                    Завантаження...
                  </Text>
                </View>
              ) : ownerProjects.length === 0 ? (
                <Text style={[styles.emptySharedUsersText, { color: theme.colors.textSecondary }]}>
                  У вас немає проєктів
                </Text>
              ) : (
                ownerProjects.map((project) => {
                  const isSelected = selectedProjectIds.has(project.id);
                  const alreadyHasAccess = selectedUser && project.members?.includes(selectedUser.id);
                  return (
                    <TouchableOpacity
                      key={project.id}
                      style={[
                        styles.projectSelectCard,
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                        isSelected && { borderColor: theme.colors.primary, borderWidth: 2 },
                        alreadyHasAccess && !isSelected && { opacity: 0.7 },
                      ]}
                      onPress={() => handleToggleProjectSelection(project.id)}
                    >
                      <View style={styles.projectSelectInfo}>
                        <View style={styles.projectSelectNameRow}>
                          <Text style={[styles.projectSelectName, { color: theme.colors.text }]}>
                            {project.name}
                          </Text>
                          {alreadyHasAccess && (
                            <Text style={[styles.alreadyHasAccessBadge, { color: theme.colors.textSecondary }]}>
                              (вже має доступ)
                            </Text>
                          )}
                        </View>
                        {project.description && (
                          <Text style={[styles.projectSelectDescription, { color: theme.colors.textSecondary }]}>
                            {project.description}
                          </Text>
                        )}
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={24} color={theme.colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: selectedProjectIds.size === 0 || isGrantingAccess ? 0.5 : 1,
                },
              ]}
              onPress={handleConfirmProjectSelection}
              disabled={selectedProjectIds.size === 0 || isGrantingAccess}
            >
              {isGrantingAccess ? (
                <ActivityIndicator color={theme.colors.primaryText} />
              ) : (
                <Text style={[styles.confirmButtonText, { color: theme.colors.primaryText }]}>
                  Надати доступ ({selectedProjectIds.size})
                </Text>
              )}
            </TouchableOpacity>
          </BottomSheetScrollView>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={revokeProjectsBottomSheetVisible}
        onClose={() => {
          setRevokeProjectsBottomSheetVisible(false);
          setSelectedUser(null);
          setSelectedProjectsToRevoke(new Set());
        }}
        enablePanDownToClose={true}
        enableBackdrop={true}
        backdropOpacity={0.5}
        snapPoints={bottomSheetSnapPoints}
      >
        <View style={styles.bottomSheetWrapper}>
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: bottomSheetContentMaxHeight }}
            contentContainerStyle={[
              styles.bottomSheetScrollContent,
              { 
                paddingBottom: insets.bottom + 24,
              },
            ]}
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            <Text style={[styles.bottomSheetTitle, { color: theme.colors.text }]}>
              Забрати доступ для {selectedUser?.displayName || selectedUser?.email}
            </Text>
            <Text style={[styles.bottomSheetDescription, { color: theme.colors.textSecondary }]}>
              Оберіть проєкти, з яких ви хочете забрати доступ користувачу
            </Text>

            <View style={styles.projectsList}>
              {projectsLoading ? (
                <View style={styles.loadingSharedUsers}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text style={[styles.loadingSharedUsersText, { color: theme.colors.textSecondary }]}>
                    Завантаження...
                  </Text>
                </View>
              ) : ownerProjects.length === 0 ? (
                <Text style={[styles.emptySharedUsersText, { color: theme.colors.textSecondary }]}>
                  У вас немає проєктів
                </Text>
              ) : (
                ownerProjects
                  .filter(project => project.members?.includes(selectedUser?.id || ''))
                  .map((project) => {
                    const isSelected = selectedProjectsToRevoke.has(project.id);
                    return (
                      <TouchableOpacity
                        key={project.id}
                        style={[
                          styles.projectSelectCard,
                          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                          isSelected && { borderColor: theme.colors.danger, borderWidth: 2 },
                        ]}
                        onPress={() => handleToggleRevokeProjectSelection(project.id)}
                      >
                        <View style={styles.projectSelectInfo}>
                          <Text style={[styles.projectSelectName, { color: theme.colors.text }]}>
                            {project.name}
                          </Text>
                          {project.description && (
                            <Text style={[styles.projectSelectDescription, { color: theme.colors.textSecondary }]}>
                              {project.description}
                            </Text>
                          )}
                        </View>
                        {isSelected ? (
                          <Ionicons name="checkmark-circle" size={24} color={theme.colors.danger} />
                        ) : (
                          <Ionicons name="ellipse-outline" size={24} color={theme.colors.textSecondary} />
                        )}
                      </TouchableOpacity>
                    );
                  })
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                {
                  backgroundColor: theme.colors.danger,
                  opacity: selectedProjectsToRevoke.size === 0 || isRevokingAccess ? 0.5 : 1,
                },
              ]}
              onPress={handleConfirmRevokeProjects}
              disabled={selectedProjectsToRevoke.size === 0 || isRevokingAccess}
            >
              {isRevokingAccess ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.confirmButtonText, { color: '#FFFFFF' }]}>
                  Забрати доступ ({selectedProjectsToRevoke.size})
                </Text>
              )}
            </TouchableOpacity>
          </BottomSheetScrollView>
        </View>
      </BottomSheet>
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerSpacer: {
      width: 40,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      flex: 1,
    },
    logoutButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
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
    sharedUserActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    actionButton: {
      borderWidth: 1,
      borderRadius: 8,
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addProjectsButton: {
      borderWidth: 1,
      borderRadius: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 4,
      minWidth: 80,
    },
    addProjectsButtonText: {
      fontSize: 12,
      fontWeight: '600',
    },
    revokeProjectsButton: {
      borderWidth: 1,
      borderRadius: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 4,
      minWidth: 80,
    },
    revokeProjectsButtonText: {
      fontSize: 12,
      fontWeight: '600',
    },
    revokeButton: {
      borderWidth: 1,
      borderRadius: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 80,
    },
    revokeButtonText: {
      fontSize: 12,
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
      textAlign: 'center',
    },
    nameHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    editButton: {
      padding: 4,
    },
    nameInputWrapper: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginTop: 8,
      marginBottom: 4,
    },
    nameInput: {
      fontSize: 16,
      fontWeight: '500',
    },
    nameErrorText: {
      fontSize: 12,
      color: colors.danger,
      marginTop: 4,
      marginBottom: 8,
    },
    nameActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    nameActionButton: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nameActionButtonPrimary: {
      borderWidth: 0,
    },
    nameActionButtonDisabled: {
      opacity: 0.6,
    },
    nameActionButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    searchInputContainer: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      paddingVertical: 4,
    },
    allUsersList: {
      marginTop: 4,
    },
    allUserCard: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    allUserInfo: {
      flex: 1,
      marginRight: 12,
    },
    allUserName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    allUserEmail: {
      fontSize: 14,
    },
    grantButton: {
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 120,
    },
    grantButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    grantButtonDisabled: {
      opacity: 0.7,
    },
    accessBadge: {
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 120,
    },
    accessBadgeText: {
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 6,
    },
    selectUserButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderWidth: 1,
      marginBottom: 20,
      gap: 8,
    },
    selectUserButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    bottomSheetWrapper: {
      flex: 1,
      paddingHorizontal: 20,
    },
    bottomSheetScrollContent: {
      paddingTop: 8,
    },
    bottomSheetTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    bottomSheetDescription: {
      fontSize: 14,
      marginBottom: 20,
      lineHeight: 20,
    },
    projectsList: {
      marginBottom: 24,
    },
    projectSelectCard: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    projectSelectInfo: {
      flex: 1,
      marginRight: 12,
    },
    projectSelectNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: 4,
    },
    projectSelectName: {
      fontSize: 16,
      fontWeight: '600',
    },
    alreadyHasAccessBadge: {
      fontSize: 12,
      fontStyle: 'italic',
      marginLeft: 8,
    },
    projectSelectDescription: {
      fontSize: 14,
    },
    confirmButton: {
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });

