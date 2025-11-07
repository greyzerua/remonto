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
  createProject,
  updateProject,
  deleteProject,
  getExpensesByProject,
} from '../services/firestore';
import { Project, ProjectFormData, ProjectStatus } from '../types';
import { formatDateShort, formatCurrency, getStatusName } from '../utils/helpers';
import BottomSheet from '../components/BottomSheet';

export default function ProjectsScreen() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    status: 'active',
    budget: undefined,
    startDate: undefined,
    endDate: undefined,
  });
  const [submitting, setSubmitting] = useState(false);

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
    setFormData({
      name: '',
      description: '',
      status: 'active',
      budget: undefined,
      startDate: undefined,
      endDate: undefined,
    });
    setModalVisible(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      status: project.status,
      budget: project.budget,
      startDate: project.startDate,
      endDate: project.endDate,
    });
    setModalVisible(true);
  };

  const handleDeleteProject = (project: Project) => {
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
              await deleteProject(project.id);
            } catch (error) {
              Alert.alert('Помилка', 'Не вдалося видалити проект');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Помилка', 'Будь ласка, введіть назву проекту');
      return;
    }

    if (!user) {
      Alert.alert('Помилка', 'Помилка авторизації');
      return;
    }

    setSubmitting(true);
    try {
      if (editingProject) {
        await updateProject(editingProject.id, formData);
      } else {
        await createProject(formData, user.uid);
      }
      setModalVisible(false);
      setEditingProject(null);
    } catch (error) {
      Alert.alert('Помилка', 'Не вдалося зберегти проект');
    } finally {
      setSubmitting(false);
    }
  };

  const renderProjectItem = ({ item }: { item: Project }) => {
    const statusColors: Record<ProjectStatus, string> = {
      active: '#34C759',
      completed: '#007AFF',
      paused: '#FF9500',
      planned: '#8E8E93',
    };

    return (
      <TouchableOpacity
        style={styles.projectCard}
        onPress={() => handleEditProject(item)}
      >
        <View style={styles.projectHeader}>
          <Text style={styles.projectName}>{item.name}</Text>
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
          <Text style={styles.projectDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.projectInfo}>
          {item.budget && (
            <Text style={styles.projectBudget}>
              Бюджет: {formatCurrency(item.budget)}
            </Text>
          )}
          {item.startDate && (
            <Text style={styles.projectDate}>
              Початок: {formatDateShort(item.startDate)}
            </Text>
          )}
        </View>

        <View style={styles.projectActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditProject(item)}
          >
            <Text style={styles.editButtonText}>Редагувати</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteProject(item)}
          >
            <Text style={styles.deleteButtonText}>Видалити</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
        {projects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>📋 Немає проектів</Text>
            <Text style={styles.emptyText}>
              Створіть перший проект ремонту, щоб почати облік витрат
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateProject}
            >
              <Text style={styles.createButtonText}>Створити проект</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={projects}
              renderItem={renderProjectItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleCreateProject}
                >
                  <Text style={styles.addButtonText}>+ Додати проект</Text>
                </TouchableOpacity>
              }
            />
          </>
        )}

        {/* BottomSheet для створення/редагування */}
        <BottomSheet
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setEditingProject(null);
          }}
          enablePanDownToClose={true}
          enableBackdrop={true}
          backdropOpacity={0.5}
        >
          <ScrollView style={styles.bottomSheetContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>
              {editingProject ? 'Редагувати проект' : 'Новий проект'}
            </Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Назва проекту *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Наприклад: Ремонт кухні"
                    value={formData.name}
                    onChangeText={(text) =>
                      setFormData({ ...formData, name: text })
                    }
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Опис</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Опис проекту (опціонально)"
                    value={formData.description}
                    onChangeText={(text) =>
                      setFormData({ ...formData, description: text })
                    }
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Статус</Text>
                  <View style={styles.statusButtons}>
                    {(['active', 'planned', 'paused', 'completed'] as ProjectStatus[]).map(
                      (status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.statusButton,
                            formData.status === status && styles.statusButtonActive,
                          ]}
                          onPress={() => setFormData({ ...formData, status })}
                        >
                          <Text
                            style={[
                              styles.statusButtonText,
                              formData.status === status &&
                                styles.statusButtonTextActive,
                            ]}
                          >
                            {getStatusName(status)}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Бюджет (₴)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={formData.budget?.toString() || ''}
                    onChangeText={(text) => {
                      const num = parseFloat(text);
                      setFormData({
                        ...formData,
                        budget: isNaN(num) ? undefined : num,
                      });
                    }}
                    keyboardType="numeric"
                  />
                </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setEditingProject(null);
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
  listContent: {
    padding: 16,
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
  projectCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    color: '#333',
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
    color: '#666',
    marginBottom: 12,
  },
  projectInfo: {
    marginBottom: 12,
  },
  projectBudget: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  projectDate: {
    fontSize: 12,
    color: '#999',
  },
  projectActions: {
    flexDirection: 'row',
    gap: 8,
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
    color: '#333',
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
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  statusButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  statusButtonText: {
    fontSize: 14,
    color: '#666',
  },
  statusButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
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
