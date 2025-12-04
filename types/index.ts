// Типи для користувачів
export interface User {
  id: string; // Firebase UID
  email: string;
  emailLowercase?: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  sharedUsers?: string[];
}

// Типи для проєктів ремонту
export type ProjectStatus = 'active' | 'completed' | 'paused' | 'planned';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  createdBy: string; // ID користувача, який створив
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  members?: string[];
}

// Типи для витрат (категорій витрат)
export interface Expense {
  id: string;
  projectId: string; // ID проєкту, до якого належить витрата
  categoryName: string; // Назва категорії (користувач вводить сам)
  labor: number; // Сума за роботу
  materials: number; // Сума за матеріали
  description?: string;
  createdBy: string; // ID користувача, який додав витрату
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// Допоміжні типи для статистики
export interface ProjectWithExpenses extends Project {
  totalExpenses: number; // Загальна сума витрат по проєкту
  expensesCount: number; // Кількість витрат
}

export interface ExpenseByCategory {
  categoryName: string;
  total: number;
  count: number;
}

// Типи для форм
export interface ProjectFormData {
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
}

export interface ExpenseFormData {
  projectId: string;
  categoryName: string; // Назва категорії (користувач вводить сам)
  labor: number; // Сума за роботу
  materials: number; // Сума за матеріали
  description?: string;
}

// Типи для аутентифікації
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}


