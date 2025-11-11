import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  subscribeToProjects,
  createProject,
  updateProject,
  deleteProject,
  getExpensesByProject,
} from '../services/firestore';
import { Project, ProjectFormData, ProjectStatus } from '../types';
import { formatDateShort, getStatusName } from '../utils/helpers';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '../components/BottomSheet';
import ClearableTextInput from '../components/ClearableTextInput';

const projectSchema = z.object({
  name: z.string().trim().min(1, 'Введіть назву проєкту'),
  status: z.enum(['active', 'planned', 'paused', 'completed']),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export default function ProjectsScreen() {
  const { user, userData } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const bottomSheetSnapPoints = useMemo(
    () => [Platform.OS === 'ios' ? 0.7 : 0.9],
    []
  );
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      status: 'active',
    },
  });
  const selectedStatus = watch('status');
  const { height: windowHeight } = useWindowDimensions();
  const bottomSheetContentMaxHeight = useMemo(
    () => windowHeight * (Platform.OS === 'ios' ? 0.62 : 0.74),
    [windowHeight]
  );

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToProjects(user.uid, (updatedProjects) => {
      setProjects(updatedProjects);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateProject = () => {
    setEditingProject(null);
    clearErrors();
    reset({
      name: '',
      status: 'active',
    });
    setModalVisible(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    clearErrors();
    reset({
      name: project.name,
      status: project.status,
    });
    setModalVisible(true);
  };

  const handleOpenProject = (project: Project) => {
    navigation.navigate('Expenses', { projectId: project.id });
  };

  const handleDeleteProject = (project: Project) => {
    if (!user) {
      Alert.alert('Помилка', 'Помилка авторизації');
      return;
    }

    Alert.alert(
      'Видалити проект',
      `Ви впевнені, що хочете видалити проект "${project.name}"? Всі витрати також будуть видалені.`,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Видалити',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProject(project.id, user.uid);
            } catch (error) {
              Alert.alert('Помилка', 'Не вдалося видалити проект');
            }
          },
        },
      ]
    );
  };

  const onSubmitProject = handleSubmit(async (values) => {
    if (!user) {
      setError('name', { type: 'manual', message: 'Помилка авторизації. Спробуйте ще раз.' });
      return;
    }

    const payload: ProjectFormData = {
      name: values.name.trim(),
      status: values.status,
      startDate: editingProject?.startDate,
      endDate: editingProject?.endDate,
    };

    try {
      if (editingProject) {
        await updateProject(editingProject.id, payload);
      } else {
        await createProject(payload, user.uid, userData?.sharedUsers ?? []);
      }
      setModalVisible(false);
      setEditingProject(null);
      reset({
        name: '',
        status: 'active',
      });
    } catch (error) {
      setError('name', {
        type: 'manual',
        message: 'Не вдалося зберегти проєкт. Спробуйте ще раз.',
      });
    }
  });

  const renderProjectItem = ({ item }: { item: Project }) => {
    const statusColors: Record<ProjectStatus, string> = {
      active: '#34C759',
      completed: theme.colors.primary,
      paused: '#FF9500',
      planned: theme.colors.textSecondary,
    };
    const styles = createStyles(theme.colors);

    return (
      <TouchableOpacity
        style={[styles.projectCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={() => handleOpenProject(item)}
      >
        <View style={styles.projectHeader}>
          <Text style={[styles.projectName, { color: theme.colors.text }]}>{item.name}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColors[item.status] + '20' },
            ]}
          >
            <Text
              style={[styles.statusText, { color: statusColors[item.status] }]}
            >
              {getStatusName(item.status)}
            </Text>
          </View>
        </View>

        {item.description && (
          <Text style={[styles.projectDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.projectInfo}>
          {item.startDate && (
            <Text style={[styles.projectDate, { color: theme.colors.textSecondary }]}>
              Початок: {formatDateShort(item.startDate)}
            </Text>
          )}
        </View>

        <View style={styles.projectActions}>
          <TouchableOpacity
            style={[
              styles.editButton,
              {
                backgroundColor: theme.isDark
                  ? 'rgba(31, 44, 61, 0.55)'
                  : theme.colors.primary,
                borderColor: theme.isDark ? 'rgba(31, 44, 61, 0.65)' : theme.colors.primary,
              },
            ]}
            onPress={() => handleEditProject(item)}
          >
            <Text style={[styles.editButtonText, { color: theme.colors.primaryText }]}>Редагувати</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: theme.colors.danger + '15' }]}
            onPress={() => handleDeleteProject(item)}
          >
            <Text style={[styles.deleteButtonText, { color: theme.colors.danger }]}>Видалити</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const styles = createStyles(theme.colors);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Завантаження...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../assets/transparent-logo.png')}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
          <TouchableOpacity
            style={[styles.themeToggleButton]}
            onPress={toggleTheme}
            activeOpacity={0.8}
          >
            <Text style={[styles.themeToggleIcon]}>
              {theme.isDark ? '☀️' : '🌙'}
            </Text>
          </TouchableOpacity>
        </View>

        {projects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>📋 Немає проектів</Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Створіть перший проект ремонту, щоб почати облік витрат
            </Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleCreateProject}
            >
              <Text style={[styles.createButtonText, { color: theme.colors.primaryText }]}>Створити проект</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.projectsListWrapper}>
              <FlatList
                data={projects}
                renderItem={renderProjectItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
              />
            </View>

            <View style={styles.bottomActionArea}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleCreateProject}
              >
                <Text style={[styles.addButtonText, { color: theme.colors.primaryText }]}>Додати проект</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

     
        <BottomSheet
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setEditingProject(null);
            reset({
              name: '',
              status: 'active',
            });
            clearErrors();
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
                { paddingBottom: insets.bottom + 24 },
              ]}
              showsVerticalScrollIndicator={true}
              bounces={false}
            >
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingProject ? 'Редагувати проект' : 'Новий проект'}
              </Text>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Назва проєкту *</Text>
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <ClearableTextInput
                      InputComponent={BottomSheetTextInput}
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: errors.name ? theme.colors.danger : theme.colors.border,
                          color: theme.colors.text,
                        },
                      ]}
                      placeholder="Наприклад: Ремонт кухні"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                    />
                  )}
                />
                {errors.name && (
                  <Text style={[styles.errorText, { color: theme.colors.danger }]}>
                    {errors.name.message}
                  </Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Статус</Text>
                <View style={styles.statusButtons}>
                  {(['active', 'planned', 'paused', 'completed'] as ProjectStatus[]).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: selectedStatus === status ? theme.colors.primary : theme.colors.border,
                        },
                        selectedStatus === status && [
                          styles.statusButtonActive,
                          { backgroundColor: theme.colors.primary },
                        ],
                      ]}
                      onPress={() => setValue('status', status, { shouldValidate: true })}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          { color: selectedStatus === status ? theme.colors.primaryText : theme.colors.textSecondary },
                        ]}
                      >
                        {getStatusName(status)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.status && (
                  <Text style={[styles.errorText, { color: theme.colors.danger }]}>
                    {errors.status.message}
                  </Text>
                )}
              </View>
            </BottomSheetScrollView>

            <View
              style={[
                styles.bottomSheetActionsContainer,
                {
                  borderTopColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                  paddingBottom: insets.bottom + 16,
                },
              ]}
            >
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.cancelButton,
                    {
                      backgroundColor: theme.isDark 
                        ? 'rgba(51, 65, 85, 0.5)' // Світліший темно-сірий для темної теми
                        : '#f1f5f9', // Світло-сірий для світлої теми
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => {
                    setModalVisible(false);
                    setEditingProject(null);
                  reset({
                    name: '',
                    status: 'active',
                  });
                  clearErrors();
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Скасувати</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
                  onPress={onSubmitProject}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={theme.colors.primaryText} />
                  ) : (
                    <Text style={[styles.saveButtonText, { color: theme.colors.primaryText }]}>Зберегти</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </BottomSheet>
      </View>
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logo: {
      width: 270,
      height: 44,
    },
    themeToggleButton: {
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeToggleIcon: {
      fontSize: 30,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
    },
    listContent: {
      padding: 16,
      paddingBottom: 24,
    },
    projectsListWrapper: {
      flex: 1,
    },
    bottomActionArea: {
      paddingHorizontal: 20,
      paddingTop: 16,
  
    },
    addButton: {
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
    },
    addButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    projectCard: {
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
    },
    projectHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    projectName: {
      fontSize: 18,
      fontWeight: '600',
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    projectDescription: {
      fontSize: 14,
      marginBottom: 12,
    },
    projectInfo: {
      marginBottom: 12,
    },
    projectDate: {
      fontSize: 12,
    },
    projectActions: {
      flexDirection: 'row',
      gap: 8,
    },
    editButton: {
      flex: 1,
      borderRadius: 8,
      padding: 10,
      alignItems: 'center',
      borderWidth: 1,
    },
    editButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    deleteButton: {
      flex: 1,
      borderRadius: 8,
      padding: 10,
      alignItems: 'center',
    },
    deleteButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 24,
    },
    createButton: {
      borderRadius: 8,
      padding: 16,
      paddingHorizontal: 32,
    },
    createButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    bottomSheetScrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 24,
    },
    bottomSheetWrapper: {
      flex: 1,
    },
    bottomSheetActionsContainer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      marginTop: 12,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
    },
    inputContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    statusButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    statusButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    statusButtonActive: {
      borderColor: colors.primary,
    },
    statusButtonText: {
      fontSize: 14,
    },
    statusButtonTextActive: {
      fontWeight: '600',
    },
    modalActions: {
      flexDirection: 'row',
  
      gap: 12,
      marginTop: 20,
      marginBottom: 20,
    },
    modalButton: {
      flex: 1,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
    },
    cancelButton: {
      borderWidth: 1,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    saveButton: {
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    errorText: {
      fontSize: 12,
      marginTop: 6,
    },
  });
