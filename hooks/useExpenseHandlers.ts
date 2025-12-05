import { useState } from 'react';
import { UseFormSetError } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmDialog } from '../contexts/ConfirmDialogContext';
import { createExpense, updateExpense, deleteExpense } from '../services/firestore';
import { Expense, ExpenseFormData, Project } from '../types';
import { showErrorToast, showSuccessToast, showWarningToast } from '../utils/toast';
import { ExpenseFormValues, normalizeAmount } from '../utils/expenseValidation';

interface UseExpenseHandlersProps {
  selectedProject: Project | null;
  resetForm: () => void;
  setFormError: UseFormSetError<ExpenseFormValues>;
}

export function useExpenseHandlers({ selectedProject, resetForm, setFormError }: UseExpenseHandlersProps) {
  const { user } = useAuth();
  const { showConfirm } = useConfirmDialog();
  
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState<string>('');
  const [editingLabor, setEditingLabor] = useState<string>('');
  const [editingMaterials, setEditingMaterials] = useState<string>('');

  const handleDeleteExpense = async (expense: Expense) => {
    const confirmed = await showConfirm({
      title: 'Видалити категорію',
      message: `Ви впевнені, що хочете видалити "${expense.categoryName}"?`,
      confirmText: 'Видалити',
      cancelText: 'Скасувати',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      if (!user) {
        showErrorToast('Користувач не авторизований');
        return;
      }
      await deleteExpense(expense.id, user.uid);
      showSuccessToast('Категорію успішно видалено');
    } catch (error: any) {
      const errorMessage = error?.message || 'Не вдалося видалити категорію';
      showErrorToast(errorMessage);
    }
  };

  const handleInlineEditStart = (expense: Expense) => {
    setEditingCategoryId(expense.id);
    setEditingCategoryName(expense.categoryName);
    setEditingLabor(expense.labor > 0 ? expense.labor.toString() : '');
    setEditingMaterials(expense.materials > 0 ? expense.materials.toString() : '');
  };

  const handleInlineEditSave = async (expense: Expense) => {
    if (!editingCategoryName.trim()) {
      showWarningToast('Будь ласка, введіть назву категорії');
      return;
    }

    const labor = parseFloat(editingLabor) || 0;
    const materials = parseFloat(editingMaterials) || 0;

    if (labor < 0 || materials < 0) {
      showWarningToast('Сума не може бути від\'ємною');
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
      setEditingLabor('');
      setEditingMaterials('');
      showSuccessToast('Зміни збережено');
    } catch (error) {
      showErrorToast('Не вдалося зберегти зміни');
    }
  };

  const handleInlineEditCancel = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
    setEditingLabor('');
    setEditingMaterials('');
  };

  const handleSubmitExpense = async (
    values: { categoryName: string; labor: string; materials: string },
    editingExpense: Expense | null,
    onSuccess: () => void
  ) => {
    if (!selectedProject || !user) {
      setFormError('categoryName', { type: 'manual', message: 'Помилка авторизації. Спробуйте ще раз.' });
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
      onSuccess();
    } catch (error) {
      setFormError('categoryName', {
        type: 'manual',
        message: 'Не вдалося зберегти категорію. Спробуйте ще раз.',
      });
    }
  };

  return {
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
  };
}

