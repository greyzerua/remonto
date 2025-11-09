import { Project, Expense, ProjectFormData, ExpenseFormData } from '../types';

/**
 * Генерація унікального ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Отримати поточну дату в ISO форматі
 */
export function getCurrentDate(): string {
  return new Date().toISOString();
}

/**
 * Форматування дати для відображення
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('uk-UA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Форматування дати для короткого відображення
 */
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('uk-UA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Форматування суми грошей
 */
export function formatCurrency(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return `${safeAmount.toLocaleString('uk-UA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} грн`;
}

/**
 * Отримати назву категорії витрат
 */
export function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    materials: 'Матеріали',
    labor: 'Робота',
    equipment: 'Обладнання',
    transport: 'Транспорт',
    other: 'Інше',
  };
  return names[category] || category;
}

/**
 * Отримати назву статусу проекту
 */
export function getStatusName(status: string): string {
  const names: Record<string, string> = {
    active: 'Активний',
    completed: 'Завершений',
    paused: 'Призупинений',
    planned: 'Запланований',
  };
  return names[status] || status;
}

