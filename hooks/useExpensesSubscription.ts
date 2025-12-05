import { useEffect, useState } from 'react';
import { subscribeToExpenses } from '../services/firestore';
import { Expense, Project } from '../types';
import { showErrorToast } from '../utils/toast';

export function useExpensesSubscription(selectedProject: Project | null, userId: string | null) {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (!selectedProject || !userId) return;

    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    const subscribe = async () => {
      try {
        unsubscribe = await subscribeToExpenses(selectedProject.id, userId, (updatedExpenses) => {
          if (isMounted) {
            setExpenses(updatedExpenses);
          }
        });
      } catch (error) {
        console.error('Не вдалося підписатися на витрати проєкту:', error);
        if (isMounted) {
          showErrorToast('У вас немає доступу до витрат цього проєкту');
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
  }, [selectedProject, userId]);

  return expenses;
}

