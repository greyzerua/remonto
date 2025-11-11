import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Project, Expense, ProjectFormData, ExpenseFormData, User } from '../types';
import { generateId, getCurrentDate } from '../utils/helpers';

const PROJECTS_COLLECTION = 'projects';
const USERS_COLLECTION = 'users';
const EXPENSES_COLLECTION = 'expenses';

const sortProjectsByCreatedAt = (projects: Project[]): Project[] => {
  return projects.sort((a, b) => {
    const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateA - dateB;
  });
};

const ensureMembersArray = (project: Project): Project => {
  if (!project.members || project.members.length === 0) {
    project.members = [project.createdBy];
  } else if (!project.members.includes(project.createdBy)) {
    project.members = Array.from(new Set([project.createdBy, ...project.members]));
  }
  return project;
};

const isUserProjectMember = async (projectId: string, userId: string): Promise<boolean> => {
  try {
    const projectDoc = await getDoc(doc(db, PROJECTS_COLLECTION, projectId));
    if (!projectDoc.exists()) {
      return false;
    }

    const project = ensureMembersArray({ id: projectDoc.id, ...projectDoc.data() } as Project);
    const members = project.members ?? [];
    return project.createdBy === userId || members.includes(userId);
  } catch (error) {
    console.error('Помилка перевірки доступу до проєкту:', error);
    return false;
  }
};

const findUserByEmail = async (email: string): Promise<User | null> => {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return null;
  }

  const normalizedEmail = trimmedEmail.toLowerCase();
  const usersRef = collection(db, USERS_COLLECTION);
  const queries = [
    query(usersRef, where('email', '==', normalizedEmail)),
  ];

  if (normalizedEmail !== trimmedEmail) {
    queries.push(query(usersRef, where('email', '==', trimmedEmail)));
  }

  queries.push(query(usersRef, where('emailLowercase', '==', normalizedEmail)));

  for (const usersQuery of queries) {
    try {
      const snapshot = await getDocs(usersQuery);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        return { id: docSnap.id, ...docSnap.data() } as User;
      }
    } catch (error) {
      console.error('Помилка пошуку користувача за email:', error);
    }
  }

  return null;
};

const addMemberToOwnerProjects = async (ownerId: string, memberId: string): Promise<void> => {
  try {
    const projectsRef = collection(db, PROJECTS_COLLECTION);
    const ownerProjectsSnapshot = await getDocs(query(projectsRef, where('createdBy', '==', ownerId)));

    if (ownerProjectsSnapshot.empty) {
      return;
    }

    const batch = writeBatch(db);
    let hasUpdates = false;

    ownerProjectsSnapshot.forEach((projectDoc) => {
      batch.update(projectDoc.ref, {
        members: arrayUnion(ownerId, memberId),
      });
      hasUpdates = true;
    });

    if (hasUpdates) {
      await batch.commit();
    }
  } catch (error) {
    console.error('Помилка додавання учасника до проектів:', error);
    throw error;
  }
};

const removeMemberFromOwnerProjects = async (ownerId: string, memberId: string): Promise<void> => {
  try {
    const projectsRef = collection(db, PROJECTS_COLLECTION);
    const ownerProjectsSnapshot = await getDocs(query(projectsRef, where('createdBy', '==', ownerId)));

    if (ownerProjectsSnapshot.empty) {
      return;
    }

    const batch = writeBatch(db);
    let hasUpdates = false;

    ownerProjectsSnapshot.forEach((projectDoc) => {
      batch.update(projectDoc.ref, {
        members: arrayRemove(memberId),
      });
      hasUpdates = true;
    });

    if (hasUpdates) {
      await batch.commit();
    }
  } catch (error) {
    console.error('Помилка видалення учасника з проектів:', error);
    throw error;
  }
};

export async function getUsersByIds(ids: string[]): Promise<User[]> {
  if (!ids || ids.length === 0) {
    return [];
  }

  const uniqueIds = Array.from(new Set(ids));
  const results = await Promise.all(
    uniqueIds.map(async (userId) => {
      try {
        const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
        if (userDoc.exists()) {
          return { id: userDoc.id, ...userDoc.data() } as User;
        }
      } catch (error) {
        console.error('Помилка отримання користувача за ID:', error);
      }
      return null;
    })
  );

  return results.filter((user): user is User => Boolean(user));
}

export async function grantProjectAccessByEmail(ownerId: string, email: string): Promise<User> {
  const targetUser = await findUserByEmail(email);

  if (!targetUser) {
    throw new Error('Користувача з таким email не знайдено');
  }

  if (targetUser.id === ownerId) {
    throw new Error('Ви не можете надати доступ собі');
  }

  const ownerRef = doc(db, USERS_COLLECTION, ownerId);
  const ownerDoc = await getDoc(ownerRef);

  if (!ownerDoc.exists()) {
    throw new Error('Профіль власника не знайдено');
  }

  const ownerData = ownerDoc.data() as User;
  const existingShared = ownerData.sharedUsers ?? [];

  if (existingShared.includes(targetUser.id)) {
    throw new Error('Цей користувач вже має доступ до ваших проєктів');
  }

  await updateDoc(ownerRef, {
    sharedUsers: arrayUnion(targetUser.id),
  });

  await addMemberToOwnerProjects(ownerId, targetUser.id);

  return targetUser;
}

export async function revokeProjectAccess(ownerId: string, memberId: string): Promise<void> {
  const ownerRef = doc(db, USERS_COLLECTION, ownerId);
  const ownerDoc = await getDoc(ownerRef);

  if (!ownerDoc.exists()) {
    throw new Error('Профіль власника не знайдено');
  }

  const ownerData = ownerDoc.data() as User;
  const existingShared = ownerData.sharedUsers ?? [];

  if (!existingShared.includes(memberId)) {
    throw new Error('Цей користувач не має доступу до ваших проєктів');
  }

  await updateDoc(ownerRef, {
    sharedUsers: arrayRemove(memberId),
  });

  await removeMemberFromOwnerProjects(ownerId, memberId);
}

// ==================== PROJECTS ====================

/**
 * Створити проект
 */
export async function createProject(
  formData: ProjectFormData,
  createdBy: string,
  sharedUserIds: string[] = []
): Promise<Project> {
  try {
    const projectId = generateId();
    const now = getCurrentDate();

    // Створюємо проект, виключаючи undefined значення
    const project: Partial<Project> = {
      id: projectId,
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
    if (formData.startDate) {
      project.startDate = formData.startDate;
    }
    if (formData.endDate) {
      project.endDate = formData.endDate;
    }

    const members = Array.from(
      new Set([createdBy, ...sharedUserIds.filter((memberId) => typeof memberId === 'string' && memberId.trim().length > 0)])
    );

    if (members.length > 0) {
      project.members = members;
    }

    await setDoc(doc(db, PROJECTS_COLLECTION, projectId), project);
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
export async function deleteProject(projectId: string, userId: string): Promise<void> {
  try {
    // Отримуємо витрати до видалення проєкту, щоб перевірка доступу пройшла успішно
    const expenses = await getExpensesByProject(projectId, userId);

    // Спочатку видаляємо всі витрати, поки проєкт ще існує (правила безпеки дозволяють доступ)
    if (expenses.length > 0) {
      const deleteExpensePromises = expenses.map((expense) => deleteExpense(expense.id));
      await Promise.all(deleteExpensePromises);
    }

    // Після цього видаляємо сам проєкт
    await deleteDoc(doc(db, PROJECTS_COLLECTION, projectId));
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
    const projectDoc = await getDoc(doc(db, PROJECTS_COLLECTION, projectId));
    if (projectDoc.exists()) {
      return ensureMembersArray({ id: projectDoc.id, ...projectDoc.data() } as Project);
    }
    return null;
  } catch (error) {
    console.error('Помилка отримання проекту:', error);
    return null;
  }
}

/**
 * Отримати проекти користувача
 */
export async function getUserProjects(userId: string): Promise<Project[]> {
  try {
    const projectsRef = collection(db, PROJECTS_COLLECTION);
    const [ownedSnapshot, sharedSnapshot] = await Promise.all([
      getDocs(query(projectsRef, where('createdBy', '==', userId))),
      getDocs(query(projectsRef, where('members', 'array-contains', userId))),
    ]);

    const mergedProjects = new Map<string, Project>();

    ownedSnapshot.forEach((docSnap) => {
      const project = ensureMembersArray({ id: docSnap.id, ...docSnap.data() } as Project);
      mergedProjects.set(docSnap.id, project);
    });

    sharedSnapshot.forEach((docSnap) => {
      const project = ensureMembersArray({ id: docSnap.id, ...docSnap.data() } as Project);
      if (project.createdBy === userId) {
        return;
      }
      mergedProjects.set(docSnap.id, project);
    });

    return sortProjectsByCreatedAt(Array.from(mergedProjects.values()));
  } catch (error) {
    console.error('Помилка отримання проектів:', error);
    return [];
  }
}

/**
 * Realtime підписка на проекти користувача
 */
export function subscribeToProjects(
  userId: string,
  callback: (projects: Project[]) => void
): () => void {
  const projectsRef = collection(db, PROJECTS_COLLECTION);
  const ownedProjectsMap = new Map<string, Project>();
  const sharedProjectsMap = new Map<string, Project>();

  const emitCombinedProjects = () => {
    const combined = new Map<string, Project>();
    ownedProjectsMap.forEach((project, id) => combined.set(id, project));
    sharedProjectsMap.forEach((project, id) => combined.set(id, project));

    callback(sortProjectsByCreatedAt(Array.from(combined.values())));
  };

  const unsubscribeOwned = onSnapshot(query(projectsRef, where('createdBy', '==', userId)), (querySnapshot) => {
    ownedProjectsMap.clear();
    querySnapshot.forEach((docSnap) => {
      const project = ensureMembersArray({ id: docSnap.id, ...docSnap.data() } as Project);
      ownedProjectsMap.set(docSnap.id, project);
    });
    emitCombinedProjects();
  });

  const unsubscribeShared = onSnapshot(query(projectsRef, where('members', 'array-contains', userId)), (querySnapshot) => {
    sharedProjectsMap.clear();
    querySnapshot.forEach((docSnap) => {
      const project = ensureMembersArray({ id: docSnap.id, ...docSnap.data() } as Project);
      if (project.createdBy === userId) {
        return;
      }
      sharedProjectsMap.set(docSnap.id, project);
    });
    emitCombinedProjects();
  });

  return () => {
    unsubscribeOwned();
    unsubscribeShared();
  };
}

// ==================== EXPENSES ====================

/**
 * Створити витрату
 */
export async function createExpense(
  formData: ExpenseFormData,
  createdBy: string
): Promise<Expense> {
  try {
    const expenseId = generateId();
    const now = getCurrentDate();

    // Створюємо витрату, виключаючи undefined значення
    const expense: Partial<Expense> = {
      id: expenseId,
      projectId: formData.projectId,
      categoryName: formData.categoryName,
      labor: formData.labor,
      materials: formData.materials,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    // Додаємо опціональні поля тільки якщо вони існують
    if (formData.description) {
      expense.description = formData.description;
    }

    await setDoc(doc(db, EXPENSES_COLLECTION, expenseId), expense);
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
      categoryName: formData.categoryName,
      labor: formData.labor,
      materials: formData.materials,
      updatedAt: getCurrentDate(),
    };

    // Додаємо опціональні поля тільки якщо вони існують
    if (formData.description !== undefined) {
      updateData.description = formData.description;
    }

    await updateDoc(doc(db, EXPENSES_COLLECTION, expenseId), updateData);
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
    await deleteDoc(doc(db, EXPENSES_COLLECTION, expenseId));
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
    const expenseDoc = await getDoc(doc(db, EXPENSES_COLLECTION, expenseId));
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
export async function getExpensesByProject(projectId: string, userId: string): Promise<Expense[]> {
  try {
    const hasAccess = await isUserProjectMember(projectId, userId);

    if (!hasAccess) {
      console.warn(`Користувач ${userId} не має доступу до проєкту ${projectId}`);
      return [];
    }

    const expensesSnapshot = await getDocs(
      query(collection(db, EXPENSES_COLLECTION), where('projectId', '==', projectId))
    );
    const expenses = expensesSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Expense));

    expenses.sort((a, b) => {
      const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB;
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
export async function subscribeToExpenses(
  projectId: string,
  userId: string,
  callback: (expenses: Expense[]) => void
): Promise<() => void> {
  const hasAccess = await isUserProjectMember(projectId, userId);

  if (!hasAccess) {
    throw new Error('У вас немає доступу до цього проєкту');
  }

  const expensesQuery = query(collection(db, EXPENSES_COLLECTION), where('projectId', '==', projectId));

  const unsubscribe = onSnapshot(expensesQuery, (querySnapshot) => {
    const expenses = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Expense[];

    expenses.sort((a, b) => {
      const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB;
    });

    callback(expenses);
  });

  return () => unsubscribe();
}

