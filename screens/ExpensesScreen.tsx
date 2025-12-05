import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Expense } from '../types';
import { formatCurrency } from '../utils/helpers';
import ExpenseItem from '../components/ExpenseItem';
import ProjectSelector from '../components/ProjectSelector';
import ExpenseModal from '../components/ExpenseModal';
import { useProjectsSubscription } from '../hooks/useProjectsSubscription';
import { useProjectSelection } from '../hooks/useProjectSelection';
import { useExpensesSubscription } from '../hooks/useExpensesSubscription';
import { useExpenseForm } from '../hooks/useExpenseForm';
import { useExpenseHandlers } from '../hooks/useExpenseHandlers';

export default function ExpensesScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
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

  // Використовуємо кастомні хуки
  const { projects, loading } = useProjectsSubscription(user?.uid || null);
  const { selectedProject, setSelectedProject } = useProjectSelection(projects);
  const expenses = useExpensesSubscription(selectedProject, user?.uid || null);
  
  const {
    control,
    handleExpenseSubmit,
    reset,
    clearErrors,
    setError,
    errors,
    isSubmitting,
    modalTotalAmount,
  } = useExpenseForm();

  const {
    editingCategoryId,
    editingCategoryName,
    editingLabor,
    editingMaterials,
    setEditingCategoryName,
    setEditingLabor,
    setEditingMaterials,
    handleDeleteExpense,
    handleInlineEditStart,
    handleInlineEditSave,
    handleInlineEditCancel,
    handleSubmitExpense,
  } = useExpenseHandlers({
    selectedProject,
    resetForm: () => reset({ categoryName: '', labor: '', materials: '' }),
    setFormError: setError as any,
  });


  const handleCreateExpense = () => {
    if (!selectedProject) return;
    setEditingExpense(null);
    clearErrors();
    reset({ categoryName: '', labor: '', materials: '' });
    setModalVisible(true);
  };

  const onSubmitExpense = handleExpenseSubmit(async (values) => {
    await handleSubmitExpense(values, editingExpense, () => {
      setModalVisible(false);
      setEditingExpense(null);
      reset({ categoryName: '', labor: '', materials: '' });
    });
  });

  // Підрахунок загальної суми всіх категорій
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.labor + expense.materials, 0);

  const styles = createStyles(theme.colors);
  const emphasisColor = theme.isDark ? theme.colors.primaryText : theme.colors.primary;

  const renderExpenseItem = ({ item }: { item: Expense }) => {
    const isEditing = editingCategoryId === item.id;

    return (
      <ExpenseItem
        expense={item}
        isEditing={isEditing}
        editingCategoryName={editingCategoryName}
        editingLabor={editingLabor}
        editingMaterials={editingMaterials}
        onCategoryNameChange={setEditingCategoryName}
        onLaborChange={setEditingLabor}
        onMaterialsChange={setEditingMaterials}
        onEditStart={() => handleInlineEditStart(item)}
        onEditSave={() => handleInlineEditSave(item)}
        onEditCancel={handleInlineEditCancel}
        onDelete={() => handleDeleteExpense(item)}
      />
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
              Спочатку створіть проєкт на вкладці "Проєкти"
            </Text>
          </View>
        ) : (
          <>
            <ProjectSelector
              projects={projects}
              selectedProject={selectedProject}
              onSelectProject={setSelectedProject}
            />

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

        <ExpenseModal
          visible={modalVisible}
          editingExpense={editingExpense}
          control={control}
          errors={errors}
          isSubmitting={isSubmitting}
          modalTotalAmount={modalTotalAmount}
          bottomSheetSnapPoints={bottomSheetSnapPoints}
          bottomSheetContentMaxHeight={bottomSheetContentMaxHeight}
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
          onSubmit={onSubmitExpense}
        />
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
  });
