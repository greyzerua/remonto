import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  Query,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Project, Expense, FamilyGroup, ProjectFormData, ExpenseFormData, FamilyGroupFormData } from '../types';
import { generateId, getCurrentDate } from '../utils/helpers';

// ==================== FAMILY GROUPS ====================

/**
 * Створити родинну групу
 */
export async function createFamilyGroup(
  formData: FamilyGroupFormData,
  ownerId: string
): Promise<FamilyGroup> {
  try {
    const groupId = generateId();
    const now = getCurrentDate();

    const group: FamilyGroup = {
      id: groupId,
      name: formData.name,
      ownerId,
      members: [
        {
          userId: ownerId,
          role: 'owner',
          joinedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'familyGroups', groupId), group);
    return group;
  } catch (error) {
    console.error('Помилка створення групи:', error);
    throw error;
  }
}

/**
 * Отримати групу за ID
 */
export async function getFamilyGroup(groupId: string): Promise<FamilyGroup | null> {
  try {
    const groupDoc = await getDoc(doc(db, 'familyGroups', groupId));
    if (groupDoc.exists()) {
      return { id: groupDoc.id, ...groupDoc.data() } as FamilyGroup;
    }
    return null;
  } catch (error) {
    console.error('Помилка отримання групи:', error);
    return null;
  }
}

/**
 * Отримати групи користувача
 */
export async function getUserFamilyGroups(userId: string): Promise<FamilyGroup[]> {
  try {
    // Отримуємо всі групи та фільтруємо на клієнті
    // (Firestore не підтримує запити по вкладених масивах об'єктів)
    const querySnapshot = await getDocs(collection(db, 'familyGroups'));
    const groups = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as FamilyGroup))
      .filter((group) => group.members.some((member) => member.userId === userId));
    return groups;
  } catch (error) {
    console.error('Помилка отримання груп:', error);
    return [];
  }
}

/**
 * Додати користувача до групи
 */
export async function addMemberToGroup(
  groupId: string,
  userId: string,
  role: 'admin' | 'member' = 'member'
): Promise<void> {
  try {
    const group = await getFamilyGroup(groupId);
    if (!group) throw new Error('Група не знайдена');

    const memberExists = group.members.some((m) => m.userId === userId);
    if (memberExists) throw new Error('Користувач вже в групі');

    group.members.push({
      userId,
      role,
      joinedAt: getCurrentDate(),
    });
    group.updatedAt = getCurrentDate();

    await updateDoc(doc(db, 'familyGroups', groupId), {
      members: group.members,
      updatedAt: group.updatedAt,
    });
  } catch (error) {
    console.error('Помилка додавання користувача:', error);
    throw error;
  }
}

// ==================== PROJECTS ====================

/**
 * Створити проект
 */
export async function createProject(
  formData: ProjectFormData,
  familyGroupId: string,
  createdBy: string
): Promise<Project> {
  try {
    const projectId = generateId();
    const now = getCurrentDate();

    // Створюємо проект, виключаючи undefined значення
    const project: Partial<Project> = {
      id: projectId,
      familyGroupId,
      name: formData.name,
      status: formData.status,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    // Додаємо опціональні поля тільки якщо вони існують
    if (formData.description) {
      project.description = formData.description;
    }
    if (formData.budget !== undefined) {
      project.budget = formData.budget;
    }
    if (formData.startDate) {
      project.startDate = formData.startDate;
    }
    if (formData.endDate) {
      project.endDate = formData.endDate;
    }

    await setDoc(doc(db, 'projects', projectId), project);
    return project as Project;
  } catch (error) {
    console.error('Помилка створення проекту:', error);
    throw error;
  }
}

/**
 * Оновити проект
 */
export async function updateProject(projectId: string, formData: ProjectFormData): Promise<void> {
  try {
    // Створюємо об'єкт оновлення без undefined значень
    const updateData: any = {
      name: formData.name,
      status: formData.status,
      updatedAt: getCurrentDate(),
    };

    // Додаємо опціональні поля тільки якщо вони існують
    if (formData.description !== undefined) {
      updateData.description = formData.description;
    }
    if (formData.budget !== undefined) {
      updateData.budget = formData.budget;
    }
    if (formData.startDate !== undefined) {
      updateData.startDate = formData.startDate;
    }
    if (formData.endDate !== undefined) {
      updateData.endDate = formData.endDate;
    }

    await updateDoc(doc(db, 'projects', projectId), updateData);
  } catch (error) {
    console.error('Помилка оновлення проекту:', error);
    throw error;
  }
}

/**
 * Видалити проект
 */
export async function deleteProject(projectId: string): Promise<void> {
  try {
    // Видаляємо проект
    await deleteDoc(doc(db, 'projects', projectId));

    // Видаляємо всі витрати проекту
    const expenses = await getExpensesByProject(projectId);
    const deletePromises = expenses.map((expense) => deleteExpense(expense.id));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Помилка видалення проекту:', error);
    throw error;
  }
}

/**
 * Отримати проект за ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
  try {
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    if (projectDoc.exists()) {
      return { id: projectDoc.id, ...projectDoc.data() } as Project;
    }
    return null;
  } catch (error) {
    console.error('Помилка отримання проекту:', error);
    return null;
  }
}

/**
 * Отримати проекти групи
 */
export async function getProjectsByGroup(familyGroupId: string): Promise<Project[]> {
  try {
    // Використовуємо тільки where, сортування на клієнті (щоб не потрібен був індекс)
    const q = query(
      collection(db, 'projects'),
      where('familyGroupId', '==', familyGroupId)
    );
    const querySnapshot = await getDocs(q);
    const projects = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Project));
    // Сортуємо на клієнті за датою створення (нові спочатку)
    projects.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
    return projects;
  } catch (error) {
    console.error('Помилка отримання проектів:', error);
    return [];
  }
}

/**
 * Realtime підписка на проекти групи
 */
export function subscribeToProjects(
  familyGroupId: string,
  callback: (projects: Project[]) => void
): () => void {
  // Використовуємо тільки where, сортування на клієнті (щоб не потрібен був індекс)
  const q = query(
    collection(db, 'projects'),
    where('familyGroupId', '==', familyGroupId)
  );

  return onSnapshot(q, (querySnapshot) => {
    const projects = querySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Project[];
    // Сортуємо на клієнті за датою створення (нові спочатку)
    projects.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
    callback(projects);
  });
}

// ==================== EXPENSES ====================

/**
 * Створити витрату
 */
export async function createExpense(
  formData: ExpenseFormData,
  familyGroupId: string,
  createdBy: string
): Promise<Expense> {
  try {
    const expenseId = generateId();
    const now = getCurrentDate();

    // Створюємо витрату, виключаючи undefined значення
    const expense: Partial<Expense> = {
      id: expenseId,
      projectId: formData.projectId,
      familyGroupId,
      name: formData.name,
      amount: formData.amount,
      category: formData.category,
      date: formData.date,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    // Додаємо опціональні поля тільки якщо вони існують
    if (formData.description) {
      expense.description = formData.description;
    }

    await setDoc(doc(db, 'expenses', expenseId), expense);
    return expense as Expense;
  } catch (error) {
    console.error('Помилка створення витрати:', error);
    throw error;
  }
}

/**
 * Оновити витрату
 */
export async function updateExpense(expenseId: string, formData: ExpenseFormData): Promise<void> {
  try {
    // Створюємо об'єкт оновлення без undefined значень
    const updateData: any = {
      projectId: formData.projectId,
      name: formData.name,
      amount: formData.amount,
      category: formData.category,
      date: formData.date,
      updatedAt: getCurrentDate(),
    };

    // Додаємо опціональні поля тільки якщо вони існують
    if (formData.description !== undefined) {
      updateData.description = formData.description;
    }

    await updateDoc(doc(db, 'expenses', expenseId), updateData);
  } catch (error) {
    console.error('Помилка оновлення витрати:', error);
    throw error;
  }
}

/**
 * Видалити витрату
 */
export async function deleteExpense(expenseId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'expenses', expenseId));
  } catch (error) {
    console.error('Помилка видалення витрати:', error);
    throw error;
  }
}

/**
 * Отримати витрату за ID
 */
export async function getExpense(expenseId: string): Promise<Expense | null> {
  try {
    const expenseDoc = await getDoc(doc(db, 'expenses', expenseId));
    if (expenseDoc.exists()) {
      return { id: expenseDoc.id, ...expenseDoc.data() } as Expense;
    }
    return null;
  } catch (error) {
    console.error('Помилка отримання витрати:', error);
    return null;
  }
}

/**
 * Отримати витрати по проекту
 */
export async function getExpensesByProject(projectId: string): Promise<Expense[]> {
  try {
    // Використовуємо тільки where, сортування на клієнті
    const q = query(
      collection(db, 'expenses'),
      where('projectId', '==', projectId)
    );
    const querySnapshot = await getDocs(q);
    const expenses = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Expense));
    // Сортуємо на клієнті за датою (нові спочатку)
    expenses.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
    return expenses;
  } catch (error) {
    console.error('Помилка отримання витрат:', error);
    return [];
  }
}

/**
 * Отримати витрати групи
 */
export async function getExpensesByGroup(familyGroupId: string): Promise<Expense[]> {
  try {
    // Використовуємо тільки where, сортування на клієнті
    const q = query(
      collection(db, 'expenses'),
      where('familyGroupId', '==', familyGroupId)
    );
    const querySnapshot = await getDocs(q);
    const expenses = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Expense));
    // Сортуємо на клієнті за датою (нові спочатку)
    expenses.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
    return expenses;
  } catch (error) {
    console.error('Помилка отримання витрат:', error);
    return [];
  }
}

/**
 * Realtime підписка на витрати проекту
 */
export function subscribeToExpenses(
  projectId: string,
  callback: (expenses: Expense[]) => void
): () => void {
  // Використовуємо тільки where, сортування на клієнті
  const q = query(
    collection(db, 'expenses'),
    where('projectId', '==', projectId)
  );

  return onSnapshot(q, (querySnapshot) => {
    const expenses = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Expense[];
    // Сортуємо на клієнті за датою (нові спочатку)
    expenses.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
    callback(expenses);
  });
}

/**
 * Realtime підписка на витрати групи
 */
export function subscribeToGroupExpenses(
  familyGroupId: string,
  callback: (expenses: Expense[]) => void
): () => void {
  // Використовуємо тільки where, сортування на клієнті
  const q = query(
    collection(db, 'expenses'),
    where('familyGroupId', '==', familyGroupId)
  );

  return onSnapshot(q, (querySnapshot) => {
    const expenses = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Expense[];
    // Сортуємо на клієнті за датою (нові спочатку)
    expenses.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
    callback(expenses);
  });
}

