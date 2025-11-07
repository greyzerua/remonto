import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToProjects,
  subscribeToExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../services/firestore';
import { Project, Expense, ExpenseFormData } from '../types';
import { formatCurrency } from '../utils/helpers';
import BottomSheet from '../components/BottomSheet';

export default function ExpensesScreen() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>({
    projectId: '',
    categoryName: '',
    labor: 0,
    materials: 0,
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Локальні стани для редагування прямо в списку
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingLabor, setEditingLabor] = useState<string>('');
  const [editingMaterials, setEditingMaterials] = useState<string>('');

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToProjects(user.uid, (updatedProjects) => {
      setProjects(updatedProjects);
      setLoading(false);
      
      // Автоматично вибираємо перший проєкт, якщо немає обраного
      if (!selectedProject && updatedProjects.length > 0) {
        setSelectedProject(updatedProjects[0]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!selectedProject) return;

    const unsubscribe = subscribeToExpenses(selectedProject.id, (updatedExpenses) => {
      setExpenses(updatedExpenses);
    });

    return () => unsubscribe();
  }, [selectedProject]);

  const handleCreateExpense = () => {
    if (!selectedProject) {
      Alert.alert('Помилка', 'Будь ласка, спочатку виберіть проєкт');
      return;
    }

    setEditingExpense(null);
    setFormData({
      projectId: selectedProject.id,
      categoryName: '',
      labor: 0,
      materials: 0,
      description: '',
    });
    setModalVisible(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      projectId: expense.projectId,
      categoryName: expense.categoryName,
      labor: expense.labor,
      materials: expense.materials,
      description: expense.description || '',
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

  const handleSubmit = async () => {
    if (!formData.categoryName.trim()) {
      Alert.alert('Помилка', 'Будь ласка, введіть назву категорії');
      return;
    }

    if (formData.labor < 0 || formData.materials < 0) {
      Alert.alert('Помилка', 'Сума не може бути від\'ємною');
      return;
    }

    if (formData.labor === 0 && formData.materials === 0) {
      Alert.alert('Помилка', 'Введіть хоча б одну суму');
      return;
    }

    if (!user) {
      Alert.alert('Помилка', 'Помилка авторизації');
      return;
    }

    setSubmitting(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, formData);
      } else {
        await createExpense(formData, user.uid);
      }
      setModalVisible(false);
      setEditingExpense(null);
    } catch (error) {
      Alert.alert('Помилка', 'Не вдалося зберегти категорію');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInlineEditStart = (expense: Expense) => {
    setEditingCategoryId(expense.id);
    setEditingLabor(expense.labor > 0 ? expense.labor.toString() : '');
    setEditingMaterials(expense.materials > 0 ? expense.materials.toString() : '');
  };

  const handleInlineEditSave = async (expense: Expense) => {
    const labor = parseFloat(editingLabor) || 0;
    const materials = parseFloat(editingMaterials) || 0;

    if (labor < 0 || materials < 0) {
      Alert.alert('Помилка', 'Сума не може бути від\'ємною');
      return;
    }

    try {
      await updateExpense(expense.id, {
        projectId: expense.projectId,
        categoryName: expense.categoryName,
        labor,
        materials,
        description: expense.description,
      });
      setEditingCategoryId(null);
    } catch (error) {
      Alert.alert('Помилка', 'Не вдалося зберегти зміни');
    }
  };

  const handleInlineEditCancel = () => {
    setEditingCategoryId(null);
    setEditingLabor('');
    setEditingMaterials('');
  };

  // Підрахунок загальної суми всіх категорій
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.labor + expense.materials, 0);

  const renderExpenseItem = ({ item }: { item: Expense }) => {
    const isEditing = editingCategoryId === item.id;
    const categoryTotal = item.labor + item.materials;

    return (
      <View style={styles.expenseCard}>
        {/* Назва категорії по центру, жирним */}
        <Text style={styles.expenseCategoryName}>{item.categoryName}</Text>

        {isEditing ? (
          // Режим редагування
          <>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>🔹 Робота</Text>
              <TextInput
                style={styles.inlineInput}
                placeholder="0"
                value={editingLabor}
                onChangeText={setEditingLabor}
                keyboardType="numeric"
                autoFocus
              />
              <Text style={styles.currencyLabel}>грн</Text>
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>🔹 Матеріали</Text>
              <TextInput
                style={styles.inlineInput}
                placeholder="0"
                value={editingMaterials}
                onChangeText={setEditingMaterials}
                keyboardType="numeric"
              />
              <Text style={styles.currencyLabel}>грн</Text>
            </View>

            <View style={styles.categoryTotalRow}>
              <Text style={styles.categoryTotalLabel}>Разом:</Text>
              <Text style={styles.categoryTotalAmount}>
                {formatCurrency((parseFloat(editingLabor) || 0) + (parseFloat(editingMaterials) || 0))} грн
              </Text>
            </View>

            <View style={styles.inlineEditActions}>
              <TouchableOpacity
                style={styles.inlineSaveButton}
                onPress={() => handleInlineEditSave(item)}
              >
                <Text style={styles.inlineSaveButtonText}>Зберегти</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.inlineCancelButton}
                onPress={handleInlineEditCancel}
              >
                <Text style={styles.inlineCancelButtonText}>Скасувати</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          // Режим перегляду
          <>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>🔹 Робота</Text>
              <Text style={styles.inputValue}>{formatCurrency(item.labor)} грн</Text>
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>🔹 Матеріали</Text>
              <Text style={styles.inputValue}>{formatCurrency(item.materials)} грн</Text>
            </View>

            <View style={styles.categoryTotalRow}>
              <Text style={styles.categoryTotalLabel}>Разом:</Text>
              <Text style={styles.categoryTotalAmount}>{formatCurrency(categoryTotal)} грн</Text>
            </View>

            <View style={styles.expenseActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleInlineEditStart(item)}
              >
                <Text style={styles.editButtonText}>Редагувати</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteExpense(item)}
              >
                <Text style={styles.deleteButtonText}>Видалити</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Завантаження...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>💰 Витрати на ремонт</Text>
          {selectedProject && (
            <Text style={styles.subtitle}>Проєкт: {selectedProject.name}</Text>
          )}
        </View>

        {projects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Спочатку створіть проєкт на вкладці "Проекти"
            </Text>
          </View>
        ) : (
          <>
            {projects.length > 1 && (
              <View style={styles.projectSelector}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {projects.map((project) => (
                    <TouchableOpacity
                      key={project.id}
                      style={[
                        styles.projectButton,
                        selectedProject?.id === project.id && styles.projectButtonActive,
                      ]}
                      onPress={() => setSelectedProject(project)}
                    >
                      <Text
                        style={[
                          styles.projectButtonText,
                          selectedProject?.id === project.id && styles.projectButtonTextActive,
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
                    <Text style={styles.emptyText}>
                      Немає категорій витрат. Додайте першу категорію
                    </Text>
                    <TouchableOpacity
                      style={styles.createButton}
                      onPress={handleCreateExpense}
                    >
                      <Text style={styles.createButtonText}>Додати категорію</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <FlatList
                      data={expenses}
                      renderItem={renderExpenseItem}
                      keyExtractor={(item) => item.id}
                      contentContainerStyle={styles.listContent}
                      ListHeaderComponent={
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={handleCreateExpense}
                        >
                          <Text style={styles.addButtonText}>+ Додати категорію</Text>
                        </TouchableOpacity>
                      }
                    />
                    
                    {/* Загальна сума по проєкту */}
                    <View style={styles.projectTotalContainer}>
                      <Text style={styles.projectTotalLabel}>Разом по проєкту:</Text>
                      <Text style={styles.projectTotalAmount}>{formatCurrency(totalAmount)} грн</Text>
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
          }}
          enablePanDownToClose={true}
          enableBackdrop={true}
          backdropOpacity={0.5}
        >
          <ScrollView style={styles.bottomSheetContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>
              {editingExpense ? 'Редагувати категорію' : 'Нова категорія'}
            </Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Назва категорії *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Наприклад: Монтаж"
                    value={formData.categoryName}
                    onChangeText={(text) =>
                      setFormData({ ...formData, categoryName: text })
                    }
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>🔹 Робота (₴)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={formData.labor > 0 ? formData.labor.toString() : ''}
                    onChangeText={(text) => {
                      const num = parseFloat(text);
                      setFormData({
                        ...formData,
                        labor: isNaN(num) ? 0 : num,
                      });
                    }}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>🔹 Матеріали (₴)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={formData.materials > 0 ? formData.materials.toString() : ''}
                    onChangeText={(text) => {
                      const num = parseFloat(text);
                      setFormData({
                        ...formData,
                        materials: isNaN(num) ? 0 : num,
                      });
                    }}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.modalTotalRow}>
                  <Text style={styles.modalTotalLabel}>Разом:</Text>
                  <Text style={styles.modalTotalAmount}>
                    {formatCurrency(formData.labor + formData.materials)} грн
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Опис (опціонально)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Додатковий опис категорії"
                    value={formData.description}
                    onChangeText={(text) =>
                      setFormData({ ...formData, description: text })
                    }
                    multiline
                    numberOfLines={3}
                  />
                </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setEditingExpense(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Скасувати</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Зберегти</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </BottomSheet>
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  projectSelector: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  projectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  projectButtonActive: {
    backgroundColor: '#007AFF',
  },
  projectButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  projectButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Місце для загальної суми
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  expenseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  expenseCategoryName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  inputValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  inlineInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginHorizontal: 8,
    textAlign: 'right',
  },
  currencyLabel: {
    fontSize: 16,
    color: '#666',
    minWidth: 40,
  },
  categoryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  categoryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoryTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  expenseActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ff3b30',
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
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  inlineSaveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  inlineCancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  inlineCancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  projectTotalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  projectTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  projectTotalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    paddingHorizontal: 32,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSheetContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    marginBottom: 20,
  },
  modalTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalTotalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
