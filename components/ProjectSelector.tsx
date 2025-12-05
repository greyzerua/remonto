import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Project } from '../types';

interface ProjectSelectorProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
}

export default function ProjectSelector({ projects, selectedProject, onSelectProject }: ProjectSelectorProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme.colors);

  if (projects.length <= 1) {
    return null;
  }

  return (
    <View style={[styles.projectSelector, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {projects.map((project) => (
          <TouchableOpacity
            key={project.id}
            style={[
              styles.projectButton,
              { backgroundColor: theme.colors.surface },
              selectedProject?.id === project.id && [styles.projectButtonActive, { backgroundColor: theme.colors.primary }],
            ]}
            onPress={() => onSelectProject(project)}
          >
            <Text
              style={[
                styles.projectButtonText,
                { color: theme.colors.textSecondary },
                selectedProject?.id === project.id && [styles.projectButtonTextActive, { color: theme.colors.primaryText }],
              ]}
            >
              {project.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    projectSelector: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
    },
    projectButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
    },
    projectButtonActive: {},
    projectButtonText: {
      fontSize: 14,
      fontWeight: '500',
    },
    projectButtonTextActive: {},
  });

