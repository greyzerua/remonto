import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { expenseSchema, ExpenseFormValues, normalizeAmount } from '../utils/expenseValidation';

export function useExpenseForm() {
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

  return {
    control,
    handleExpenseSubmit,
    reset,
    watch,
    setError,
    clearErrors,
    errors,
    isSubmitting,
    modalTotalAmount,
  };
}

