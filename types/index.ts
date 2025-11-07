// Типи для користувачів та груп
export type UserRole = 'owner' | 'admin' | 'member';

export interface User {
  id: string; // Firebase UID
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
}

export interface FamilyGroup {
  id: string;
  name: string; // Назва родинної групи
  ownerId: string; // ID власника групи
  members: {
    userId: string;
    role: UserRole;
    joinedAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

// Типи для проектів ремонту
export type ProjectStatus = 'active' | 'completed' | 'paused' | 'planned';

export interface Project {
  id: string;
  familyGroupId: string; // ID родинної групи
  name: string;
  description?: string;
  status: ProjectStatus;
  budget?: number; // Загальний бюджет проекту
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  createdBy: string; // ID користувача, який створив
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// Категорії витрат
export type ExpenseCategory =
  | 'materials' // Матеріали
  | 'labor' // Робота
  | 'equipment' // Обладнання
  | 'transport' // Транспорт
  | 'other'; // Інше

// Типи для витрат
export interface Expense {
  id: string;
  projectId: string; // ID проекту, до якого належить витрата
  familyGroupId: string; // ID родинної групи
  name: string; // Назва витрати
  amount: number; // Сума витрати
  category: ExpenseCategory;
  description?: string;
  date: string; // ISO date string
  createdBy: string; // ID користувача, який додав витрату
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// Допоміжні типи для статистики
export interface ProjectWithExpenses extends Project {
  totalExpenses: number; // Загальна сума витрат по проекту
  expensesCount: number; // Кількість витрат
  remainingBudget?: number; // Залишок бюджету (якщо вказано)
}

export interface ExpenseByCategory {
  category: ExpenseCategory;
  total: number;
  count: number;
}

// Типи для форм
export interface ProjectFormData {
  name: string;
  description?: string;
  status: ProjectStatus;
  budget?: number;
  startDate?: string;
  endDate?: string;
}

export interface ExpenseFormData {
  projectId: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  description?: string;
  date: string;
}

// Типи для аутентифікації
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Типи для форм груп
export interface FamilyGroupFormData {
  name: string;
}

