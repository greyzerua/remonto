import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFamilyGroup } from '../contexts/FamilyGroupContext';
import { useAuth } from '../contexts/AuthContext';
import { createFamilyGroup, addMemberToGroup } from '../services/firestore';
import { FamilyGroup } from '../types';
import { formatDateShort } from '../utils/helpers';

export default function FamilyGroupScreen() {
  const { groups, currentGroup, setCurrentGroup, loading, refreshGroups } =
    useFamilyGroup();
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Помилка', 'Будь ласка, введіть назву групи');
      return;
    }

    if (!user) {
      Alert.alert('Помилка', 'Користувач не авторизований');
      return;
    }

    setCreating(true);
    try {
      const newGroup = await createFamilyGroup({ name: groupName.trim() }, user.uid);
      setCurrentGroup(newGroup);
      await refreshGroups();
      setGroupName('');
      Alert.alert('Успіх', 'Група успішно створена!');
    } catch (error: any) {
      Alert.alert('Помилка', 'Не вдалося створити групу');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleSelectGroup = (group: FamilyGroup) => {
    setCurrentGroup(group);
    Alert.alert('Успіх', `Вибрано групу: ${group.name}`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshGroups();
    setRefreshing(false);
  };

  const renderGroupItem = ({ item }: { item: FamilyGroup }) => {
    const isSelected = currentGroup?.id === item.id;
    const isOwner = item.ownerId === user?.uid;

    return (
      <TouchableOpacity
        style={[styles.groupItem, isSelected && styles.groupItemSelected]}
        onPress={() => handleSelectGroup(item)}
      >
        <View style={styles.groupItemContent}>
          <Text style={styles.groupName}>{item.name}</Text>
          <Text style={styles.groupInfo}>
            {item.members.length} {item.members.length === 1 ? 'учасник' : 'учасників'}
            {isOwner && ' • Власник'}
          </Text>
          <Text style={styles.groupDate}>
            Створено: {formatDateShort(item.createdAt)}
          </Text>
        </View>
        {isSelected && <Text style={styles.selectedBadge}>✓ Вибрано</Text>}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Завантаження...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>👨‍👩‍👧‍👦 Родинні групи</Text>
        <Text style={styles.subtitle}>
          {currentGroup
            ? `Поточна група: ${currentGroup.name}`
            : 'Виберіть або створіть групу'}
        </Text>
      </View>

      <View style={styles.createSection}>
        <Text style={styles.sectionTitle}>Створити нову групу</Text>
        <TextInput
          style={styles.input}
          placeholder="Назва групи"
          value={groupName}
          onChangeText={setGroupName}
          editable={!creating}
        />
        <TouchableOpacity
          style={[styles.createButton, creating && styles.buttonDisabled]}
          onPress={handleCreateGroup}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Створити групу</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Ваші групи</Text>
        {groups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>У вас поки немає груп</Text>
            <Text style={styles.emptySubtext}>
              Створіть нову групу, щоб почати роботу
            </Text>
          </View>
        ) : (
          <FlatList
            data={groups}
            renderItem={renderGroupItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
      </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  createSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listSection: {
    flex: 1,
    padding: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  groupItem: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  groupItemSelected: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: '#e6f2ff',
  },
  groupItemContent: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  groupInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  groupDate: {
    fontSize: 12,
    color: '#999',
  },
  selectedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

