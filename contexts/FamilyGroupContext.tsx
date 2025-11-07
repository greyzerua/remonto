import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FamilyGroup } from '../types';
import { getUserFamilyGroups, getFamilyGroup } from '../services/firestore';
import { useAuth } from './AuthContext';

const STORAGE_KEY = '@remonto:currentGroupId';

interface FamilyGroupContextType {
  groups: FamilyGroup[];
  currentGroup: FamilyGroup | null;
  loading: boolean;
  setCurrentGroup: (group: FamilyGroup | null) => void;
  refreshGroups: () => Promise<void>;
}

const FamilyGroupContext = createContext<FamilyGroupContextType | undefined>(undefined);

export function FamilyGroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [currentGroup, setCurrentGroup] = useState<FamilyGroup | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshGroups = async () => {
    if (!user) {
      setGroups([]);
      setCurrentGroup(null);
      await AsyncStorage.removeItem(STORAGE_KEY);
      setLoading(false);
      return;
    }

    try {
      const userGroups = await getUserFamilyGroups(user.uid);
      setGroups(userGroups);

      // Спробувати відновити вибрану групу з AsyncStorage
      try {
        const savedGroupId = await AsyncStorage.getItem(STORAGE_KEY);
        
        if (savedGroupId) {
          const savedGroup = userGroups.find((g) => g.id === savedGroupId);
          if (savedGroup) {
            // Група існує, встановлюємо її
            setCurrentGroup(savedGroup);
          } else {
            // Група більше не існує або користувач вийшов з неї
            await AsyncStorage.removeItem(STORAGE_KEY);
            setCurrentGroup(null);
          }
        } else {
        // Якщо є поточна група в стані, перевірити чи вона ще існує
        setCurrentGroup((prevGroup) => {
          if (prevGroup) {
            const stillExists = userGroups.some((g) => g.id === prevGroup.id);
            if (stillExists) {
              // Оновити дані групи
              const updatedGroup = userGroups.find((g) => g.id === prevGroup.id);
              return updatedGroup || null;
            }
            return null; // Група більше не існує
          }
          return null;
        });
        }
      } catch (storageError) {
        console.error('Помилка читання з AsyncStorage:', storageError);
        // Продовжуємо без відновлення збереженої групи
      }
    } catch (error) {
      console.error('Помилка оновлення груп:', error);
    } finally {
      setLoading(false);
    }
  };

  // Оновлена функція для встановлення групи з збереженням
  const setCurrentGroupWithStorage = async (group: FamilyGroup | null) => {
    setCurrentGroup(group);
    try {
      if (group) {
        await AsyncStorage.setItem(STORAGE_KEY, group.id);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Помилка збереження вибраної групи:', error);
      // Продовжуємо роботу навіть якщо збереження не вдалося
    }
  };

  useEffect(() => {
    refreshGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const value: FamilyGroupContextType = {
    groups,
    currentGroup,
    loading,
    setCurrentGroup: setCurrentGroupWithStorage,
    refreshGroups,
  };

  return (
    <FamilyGroupContext.Provider value={value}>{children}</FamilyGroupContext.Provider>
  );
}

export function useFamilyGroup() {
  const context = useContext(FamilyGroupContext);
  if (context === undefined) {
    throw new Error('useFamilyGroup must be used within a FamilyGroupProvider');
  }
  return context;
}

