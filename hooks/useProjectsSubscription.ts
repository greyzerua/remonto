import { useEffect, useRef, useState } from 'react';
import { subscribeToProjects } from '../services/firestore';
import { Project } from '../types';
import { showSuccessToast, showWarningToast } from '../utils/toast';

const getProjectWord = (count: number): string => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'проєктів';
  } else if (lastDigit === 1) {
    return 'проєкту';
  } else if (lastDigit >= 2 && lastDigit <= 4) {
    return 'проєктів';
  } else {
    return 'проєктів';
  }
};

export function useProjectsSubscription(userId: string | null) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const previousProjectsRef = useRef<Map<string, Project>>(new Map());
  const isInitialLoadRef = useRef(true);
  const hasSeenSharedProjectsRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToProjects(userId, (updatedProjects) => {
      const currentProjectsMap = new Map(updatedProjects.map(p => [p.id, p]));
      const previousProjectsMap = previousProjectsRef.current;
      
      const hasSharedProjects = updatedProjects.some(p => p.createdBy !== userId);
      
      if (!isInitialLoadRef.current && previousProjectsMap.size > 0 && hasSeenSharedProjectsRef.current) {
        // Знаходимо нові спільні проєкти
        const newSharedProjects = updatedProjects.filter(project => {
          const isNew = !previousProjectsMap.has(project.id);
          const isShared = project.createdBy !== userId;
          return isNew && isShared;
        });

        if (newSharedProjects.length > 0) {
          const projectsCount = newSharedProjects.length;
          showSuccessToast(
            `Вам надали доступ до ${projectsCount} ${getProjectWord(projectsCount)}`,
            'Новий доступ'
          );
        }

        // Знаходимо проєкти, з яких забрали доступ
        const revokedProjects: Project[] = [];
        previousProjectsMap.forEach((previousProject, projectId) => {
          if (!currentProjectsMap.has(projectId)) {
            if (previousProject.createdBy !== userId) {
              revokedProjects.push(previousProject);
            }
          }
        });

        if (revokedProjects.length > 0) {
          const projectsCount = revokedProjects.length;
          showWarningToast(
            `У вас забрали доступ до ${projectsCount} ${getProjectWord(projectsCount)}`,
            'Доступ скасовано'
          );
        }
      }

      if (hasSharedProjects) {
        hasSeenSharedProjectsRef.current = true;
      }
      
      previousProjectsRef.current = new Map(updatedProjects.map(p => [p.id, p]));
      
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }
      setProjects(updatedProjects);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { projects, loading };
}

