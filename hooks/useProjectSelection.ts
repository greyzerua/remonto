import { useEffect, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Project } from '../types';

export function useProjectSelection(projects: Project[]) {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const projectIdFromParams = route.params?.projectId as string | undefined;
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!projects.length) {
      setSelectedProject(null);
      return;
    }

    if (projectIdFromParams) {
      const projectFromParams = projects.find((project) => project.id === projectIdFromParams);
      if (projectFromParams && selectedProject?.id !== projectFromParams.id) {
        setSelectedProject(projectFromParams);
        navigation.setParams({ projectId: undefined });
        return;
      }
    }

    if (selectedProject) {
      const stillExists = projects.some((project) => project.id === selectedProject.id);
      if (!stillExists) {
        setSelectedProject(projects[0]);
      }
    } else {
      setSelectedProject(projects[0]);
    }
  }, [projects, projectIdFromParams, selectedProject, navigation]);

  return { selectedProject, setSelectedProject };
}

