import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  subscribeToProjects,
  subscribeToExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../services/firestore';
import { Project, Expense, ExpenseFormData } from '../types';
import { formatCurrency } from '../utils/helpers';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '../components/BottomSheet';
import ClearableTextInput from '../components/ClearableTextInput';

const normalizeAmount = (value: string) => {
  if (value === undefined || value === null) {
    return NaN;
  }

  const normalized = value.replace(',', '.');
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const amountField = z
  .string()
  .trim()
  .refine((val) => val === '' || !Number.isNaN(normalizeAmount(val)), {
    message: 'Некоректне число',
  })
  .refine((val) => val === '' || normalizeAmount(val) >= 0, {
    message: 'Сума не може бути відʼємною',
  });

const expenseSchema = z
  .object({
    categoryName: z.string().trim().min(1, 'Введіть назву категорії'),
    labor: amountField,
    materials: amountField,
  })
  .superRefine((data, ctx) => {
    const laborValue = normalizeAmount(data.labor);
    const materialsValue = normalizeAmount(data.materials);
    const safeLabor = Number.isNaN(laborValue) ? 0 : laborValue;
    const safeMaterials = Number.isNaN(materialsValue) ? 0 : materialsValue;

    if (safeLabor <= 0 && safeMaterials <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['materials'],
        message: 'Введіть хоча б одну суму',
      });
    }
  });

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export default function ExpensesScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const projectIdFromParams = route.params?.projectId as string | undefined;
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const bottomSheetSnapPoints = useMemo(
    () => [Platform.OS === 'ios' ? 0.7 : 0.92],
    []
  );
  const { height: windowHeight } = useWindowDimensions();
  const bottomSheetContentMaxHeight = useMemo(
    () => windowHeight * (Platform.OS === 'ios' ? 0.62 : 0.74),
    [windowHeight]
  );
  const {
    control,
    handleSubmit: handleExpenseSubmit,
    reset,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      categoryName: '',
      labor: '',
      materials: '',
    },
  });
  const watchLabor = watch('labor');
  const watchMaterials = watch('materials');
  const laborAmountForSummary = (() => {
    const parsed = normalizeAmount(watchLabor || '');
    return Number.isNaN(parsed) ? 0 : parsed;
  })();
  const materialsAmountForSummary = (() => {
    const parsed = normalizeAmount(watchMaterials || '');
    return Number.isNaN(parsed) ? 0 : parsed;
  })();
  const modalTotalAmount = laborAmountForSummary + materialsAmountForSummary;

  // Локальні стани для редагування прямо в списку
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState<string>('');
  const [editingLabor, setEditingLabor] = useState<string>('');
  const [editingMaterials, setEditingMaterials] = useState<string>('');

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToProjects(user.uid, (updatedProjects) => {
      setProjects(updatedProjects);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!projects.length) {
      setSelectedProject(null);
      return;
    }

    if (projectIdFromParams) {
      const projectFromParams = projects.find((project) => project.id === projectIdFromParams);
      if (projectFromParams && selectedProject?.id !== projectFromParams.id) {
        setSelectedProject(projectFromParams);
        navigation.setParams({ projectId: undefined });
        return;
      }
    }

    if (selectedProject) {
      const stillExists = projects.some((project) => project.id === selectedProject.id);
      if (!stillExists) {
        setSelectedProject(projects[0]);
      }
    } else {
      setSelectedProject(projects[0]);
    }
  }, [projects, projectIdFromParams, selectedProject, navigation]);

  useEffect(() => {
    if (!selectedProject || !user) return;

    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    const subscribe = async () => {
      try {
        unsubscribe = await subscribeToExpenses(selectedProject.id, user.uid, (updatedExpenses) => {
          if (isMounted) {
            setExpenses(updatedExpenses);
          }
        });
      } catch (error) {
        console.error('Не вдалося підписатися на витрати проєкту:', error);
        if (isMounted) {
          Alert.alert('Помилка', 'У вас немає доступу до витрат цього проєкту');
          setExpenses([]);
        }
      }
    };

    subscribe();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedProject, user]);

  const handleCreateExpense = () => {
    if (!selectedProject) {
      return;
    }

    setEditingExpense(null);
    clearErrors();
    reset({
      categoryName: '',
      labor: '',
      materials: '',
    });
    setModalVisible(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    clearErrors();
    reset({
      categoryName: expense.categoryName,
      labor: expense.labor > 0 ? expense.labor.toString() : '',
      materials: expense.materials > 0 ? expense.materials.toString() : '',
    });
    setModalVisible(true);
  };

  const handleDeleteExpense = (expense: Expense) => {
    Alert.alert(
      'Видалити категорію',
      `Ви впевнені, що хочете видалити "${expense.categoryName}"?`,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Видалити',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(expense.id);
            } catch (error) {
              Alert.alert('Помилка', 'Не вдалося видалити категорію');
            }
          },
        },
      ]
    );
  };

  const onSubmitExpense = handleExpenseSubmit(async (values) => {
    if (!selectedProject || !user) {
      setError('categoryName', { type: 'manual', message: 'Помилка авторизації. Спробуйте ще раз.' });
      return;
    }

    const laborAmountRaw = normalizeAmount(values.labor);
    const materialsAmountRaw = normalizeAmount(values.materials);
    const laborAmount = Number.isNaN(laborAmountRaw) ? 0 : laborAmountRaw;
    const materialsAmount = Number.isNaN(materialsAmountRaw) ? 0 : materialsAmountRaw;

    const payload: ExpenseFormData = {
      projectId: selectedProject.id,
      categoryName: values.categoryName.trim(),
      labor: laborAmount,
      materials: materialsAmount,
    };

    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, payload);
      } else {
        await createExpense(payload, user.uid);
      }
      setModalVisible(false);
      setEditingExpense(null);
      reset({
        categoryName: '',
        labor: '',
        materials: '',
      });
    } catch (error) {
      setError('categoryName', {
        type: 'manual',
        message: 'Не вдалося зберегти категорію. Спробуйте ще раз.',
      });
    }
  });

  const handleInlineEditStart = (expense: Expense) => {
    setEditingCategoryId(expense.id);
    setEditingCategoryName(expense.categoryName);
    setEditingLabor(expense.labor > 0 ? expense.labor.toString() : '');
    setEditingMaterials(expense.materials > 0 ? expense.materials.toString() : '');
  };

  const handleInlineEditSave = async (expense: Expense) => {
    if (!editingCategoryName.trim()) {
      Alert.alert('Помилка', 'Будь ласка, введіть назву категорії');
      return;
    }

    const labor = parseFloat(editingLabor) || 0;
    const materials = parseFloat(editingMaterials) || 0;

    if (labor < 0 || materials < 0) {
      Alert.alert('Помилка', 'Сума не може бути від\'ємною');
      return;
    }

    try {
      await updateExpense(expense.id, {
        projectId: expense.projectId,
        categoryName: editingCategoryName.trim(),
        labor,
        materials,
        description: expense.description,
      });
      setEditingCategoryId(null);
      setEditingCategoryName('');
    } catch (error) {
      Alert.alert('Помилка', 'Не вдалося зберегти зміни');
    }
  };

  const handleInlineEditCancel = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
    setEditingLabor('');
    setEditingMaterials('');
  };

  // Підрахунок загальної суми всіх категорій
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.labor + expense.materials, 0);

  const styles = createStyles(theme.colors);
  const emphasisColor = theme.isDark ? theme.colors.primaryText : theme.colors.primary;

  const renderExpenseItem = ({ item }: { item: Expense }) => {
    const isEditing = editingCategoryId === item.id;
    const categoryTotal = item.labor + item.materials;

    return (
      <View style={[styles.expenseCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        
        {isEditing ? (
          <ClearableTextInput
            style={[
              styles.expenseCategoryInput,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            placeholder="Назва категорії"
            placeholderTextColor={theme.colors.textSecondary}
            value={editingCategoryName}
            onChangeText={setEditingCategoryName}
          />
        ) : (
          <Text style={[styles.expenseCategoryName, { color: theme.colors.text }]}>{item.categoryName}</Text>
        )}

        {isEditing ? (
          // Режим редагування
          <>
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>🔹 Робота</Text>
              <ClearableTextInput
                containerStyle={{ flex: 1 }}
                style={[
                  styles.inlineInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="0"
                placeholderTextColor={theme.colors.textSecondary}
                value={editingLabor}
                onChangeText={setEditingLabor}
                keyboardType="numeric"
                autoFocus
              />
              <Text style={[styles.currencyLabel, { color: theme.colors.textSecondary }]}>грн</Text>
            </View>

            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>🔹 Матеріали</Text>
              <ClearableTextInput
                containerStyle={{ flex: 1 }}
                style={[
                  styles.inlineInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="0"
                placeholderTextColor={theme.colors.textSecondary}
                value={editingMaterials}
                onChangeText={setEditingMaterials}
                keyboardType="numeric"
              />
              <Text style={[styles.currencyLabel, { color: theme.colors.textSecondary }]}>грн</Text>
            </View>

            <View style={[styles.categoryTotalRow, { borderTopColor: theme.colors.border }]}>
              <Text style={[styles.categoryTotalLabel, { color: theme.colors.text }]}>Разом:</Text>
              <Text style={[styles.categoryTotalAmount, { color: emphasisColor }]}>
                {formatCurrency((parseFloat(editingLabor) || 0) + (parseFloat(editingMaterials) || 0))}
              </Text>
            </View>

            <View style={styles.inlineEditActions}>
              <TouchableOpacity
                style={[styles.inlineSaveButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => handleInlineEditSave(item)}
              >
                <Text style={[styles.inlineSaveButtonText, { color: theme.colors.primaryText }]}>Зберегти</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.inlineCancelButton,
                  { backgroundColor: theme.colors.danger + '15' },
                ]}
                onPress={handleInlineEditCancel}
              >
                <Text style={[styles.inlineCancelButtonText, { color: theme.colors.danger }]}>Скасувати</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          // Режим перегляду
          <>
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>🔹 Робота</Text>
              <Text style={[styles.inputValue, { color: emphasisColor }]}>{formatCurrency(item.labor)}</Text>
            </View>

            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>🔹 Матеріали</Text>
              <Text style={[styles.inputValue, { color: emphasisColor }]}>{formatCurrency(item.materials)}</Text>
            </View>

            <View style={[styles.categoryTotalRow, { borderTopColor: theme.colors.border }]}>
              <Text style={[styles.categoryTotalLabel, { color: theme.colors.text }]}>Разом:</Text>
              <Text style={[styles.categoryTotalAmount, { color: emphasisColor }]}>{formatCurrency(categoryTotal)}</Text>
            </View>

            <View style={styles.expenseActions}>
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
                onPress={() => handleInlineEditStart(item)}
              >
              <Text style={[styles.editButtonText, { color: theme.colors.primaryText }]}>Редагувати</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: theme.colors.danger + '15' }]}
                onPress={() => handleDeleteExpense(item)}
              >
                <Text style={[styles.deleteButtonText, { color: theme.colors.danger }]}>Видалити</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

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
        <View style={[styles.header]}>
          <Text style={[styles.title, { color: theme.colors.text, textAlign: 'center' }]}>Витрати на ремонт</Text>
          {selectedProject && (
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary, textAlign: 'center' }]}>Проєкт: {selectedProject.name}</Text>
          )}
        </View>

        {projects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Спочатку створіть проєкт на вкладці "Проекти"
            </Text>
          </View>
        ) : (
          <>
            {projects.length > 1 && (
              <View style={[styles.projectSelector, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {projects.map((project) => (
                    <TouchableOpacity
                      key={project.id}
                      style={[
                        styles.projectButton,
                        { backgroundColor: theme.colors.surface },
                        selectedProject?.id === project.id && [styles.projectButtonActive, { backgroundColor: theme.colors.primary }],
                      ]}
                      onPress={() => setSelectedProject(project)}
                    >
                      <Text
                        style={[
                          styles.projectButtonText,
                          { color: theme.colors.textSecondary },
                          selectedProject?.id === project.id && [styles.projectButtonTextActive, { color: theme.colors.primaryText }],
                        ]}
                      >
                        {project.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {selectedProject && (
              <>
                {expenses.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                      Немає категорій витрат. Додайте першу категорію
                    </Text>
                    <TouchableOpacity
                      style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
                      onPress={handleCreateExpense}
                    >
                      <Text style={[styles.createButtonText, { color: theme.colors.primaryText }]}>Додати категорію</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.expensesListWrapper}>
                      <FlatList
                        data={expenses}
                        renderItem={renderExpenseItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                      />
                    </View>

                    <View style={styles.bottomActionArea}>
                      <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handleCreateExpense}
                      >
                        <Text style={[styles.addButtonText, { color: theme.colors.primaryText }]}>Додати категорію</Text>
                      </TouchableOpacity>

                      <View style={[styles.projectTotalContainer, { borderTopColor: theme.colors.primary }]}>
                        <Text style={[styles.projectTotalLabel, { color: theme.colors.text }]}>Разом по проєкту:</Text>
                        <Text style={[styles.projectTotalAmount, { color: emphasisColor }]}>{formatCurrency(totalAmount)}</Text>
                      </View>
                    </View>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* BottomSheet для створення нової категорії */}
        <BottomSheet
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setEditingExpense(null);
            reset({
              categoryName: '',
              labor: '',
              materials: '',
            });
            clearErrors();
          }}
          enablePanDownToClose={true}
          enableBackdrop={true}
          snapPoints={bottomSheetSnapPoints}
          backdropOpacity={0.5}
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
                {editingExpense ? 'Редагувати категорію' : 'Нова категорія'}
              </Text>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Назва категорії *</Text>
                <Controller
                  control={control}
                  name="categoryName"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <ClearableTextInput
                      InputComponent={BottomSheetTextInput}
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: errors.categoryName ? theme.colors.danger : theme.colors.border,
                          color: theme.colors.text,
                        },
                      ]}
                      placeholder="Наприклад: Монтаж кухні"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                    />
                  )}
                />
                {errors.categoryName && (
                  <Text style={[styles.errorText, { color: theme.colors.danger }]}>
                    {errors.categoryName.message}
                  </Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: theme.colors.text }]}>🔹 Робота (₴)</Text>
                <Controller
                  control={control}
                  name="labor"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <ClearableTextInput
                      InputComponent={BottomSheetTextInput}
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: errors.labor ? theme.colors.danger : theme.colors.border,
                          color: theme.colors.text,
                        },
                      ]}
                      placeholder="0"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={value ?? ''}
                      onChangeText={(text) => onChange(text.replace(/[^0-9.,]/g, ''))}
                      onBlur={onBlur}
                      keyboardType="numeric"
                    />
                  )}
                />
                {errors.labor && (
                  <Text style={[styles.errorText, { color: theme.colors.danger }]}>
                    {errors.labor.message}
                  </Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: theme.colors.text }]}>🔹 Матеріали (₴)</Text>
                <Controller
                  control={control}
                  name="materials"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <ClearableTextInput
                      InputComponent={BottomSheetTextInput}
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: errors.materials ? theme.colors.danger : theme.colors.border,
                          color: theme.colors.text,
                        },
                      ]}
                      placeholder="0"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={value ?? ''}
                      onChangeText={(text) => onChange(text.replace(/[^0-9.,]/g, ''))}
                      onBlur={onBlur}
                      keyboardType="numeric"
                    />
                  )}
                />
                {errors.materials && (
                  <Text style={[styles.errorText, { color: theme.colors.danger }]}>
                    {errors.materials.message}
                  </Text>
                )}
              </View>

              <View style={[styles.modalTotalRow, { backgroundColor: theme.colors.primary + '15' }]}>
                <Text style={[styles.modalTotalLabel, { color: theme.colors.text }]}>Разом:</Text>
                <Text style={[styles.modalTotalAmount, { color: emphasisColor }]}>
                  {formatCurrency(modalTotalAmount)}
                </Text>
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
                    setEditingExpense(null);
                  reset({
                    categoryName: '',
                    labor: '',
                    materials: '',
                  });
                  clearErrors();
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Скасувати</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
                onPress={onSubmitExpense}
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
    },
    header: {
      padding: 20,
      borderBottomWidth: 1,
      alignItems: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
    },
    projectSelector: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
    },
    projectButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
    },
    projectButtonActive: {
    },
    projectButtonText: {
      fontSize: 14,
      fontWeight: '500',
    },
    projectButtonTextActive: {
    },
    listContent: {
      padding: 16,
      paddingBottom: 24,
    },
    expensesListWrapper: {
      flex: 1,
    },
    bottomActionArea: {
      paddingHorizontal: 20,
      paddingTop: 16,
      gap: 16,
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
    expenseCard: {
      borderRadius: 12,
      gap: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
    },
    expenseCategoryName: {
      fontSize: 20,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 16,
    },
    expenseCategoryInput: {
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
    
    },
    inputLabel: {
      fontSize: 16,
      flex: 1,
    },
    inputValue: {
      fontSize: 16,
      fontWeight: '600',
    },
    inlineInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      marginHorizontal: 8,
      textAlign: 'right',
    },
    currencyLabel: {
      fontSize: 16,
      minWidth: 40,
    },
    categoryTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
    },
    categoryTotalLabel: {
      fontSize: 16,
      fontWeight: '600',
    },
    categoryTotalAmount: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    expenseActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
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
    inlineEditActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    inlineSaveButton: {
      flex: 1,
      borderRadius: 8,
      padding: 10,
      alignItems: 'center',
    },
    inlineSaveButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    inlineCancelButton: {
      flex: 1,
      borderRadius: 8,
      padding: 10,
      alignItems: 'center',
    },
    inlineCancelButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    projectTotalContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
    },
    projectTotalLabel: {
      fontSize: 18,
      fontWeight: '600',
      flex: 1,
    },
    projectTotalAmount: {
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'right',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
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
  
    },
    bottomSheetWrapper: {
      flex: 1,
    },
    bottomSheetActionsContainer: {

      paddingHorizontal: 20,
 
  
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    inputContainer: {
      marginBottom: 10,
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
    modalTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderRadius: 8,
      
    },
    modalTotalLabel: {
      fontSize: 16,
      fontWeight: '600',
    },
    modalTotalAmount: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,

    },
    modalButton: {
      flex: 1,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
    },
    errorText: {
      fontSize: 12,
      marginTop: 6,
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
  });
