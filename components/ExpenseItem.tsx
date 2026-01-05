import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Expense } from '../types';
import { formatCurrency } from '../utils/helpers';
import ClearableTextInput from './ClearableTextInput';

interface ExpenseItemProps {
  expense: Expense;
  isEditing: boolean;
  editingCategoryName: string;
  editingLabor: string;
  editingMaterials: string;
  onCategoryNameChange: (value: string) => void;
  onLaborChange: (value: string) => void;
  onMaterialsChange: (value: string) => void;
  onEditStart: () => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDelete: () => void;
}

export default function ExpenseItem({
  expense,
  isEditing,
  editingCategoryName,
  editingLabor,
  editingMaterials,
  onCategoryNameChange,
  onLaborChange,
  onMaterialsChange,
  onEditStart,
  onEditSave,
  onEditCancel,
  onDelete,
}: ExpenseItemProps) {
  const { theme } = useTheme();
  const categoryTotal = expense.labor + expense.materials;
  const emphasisColor = theme.isDark ? theme.colors.primaryText : theme.colors.primary;
  const styles = createStyles(theme.colors);

  return (
    <View style={[styles.expenseCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {isEditing ? (
        <ClearableTextInput
          style={[
            styles.expenseCategoryInput,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
          placeholder="Назва категорії"
          placeholderTextColor={theme.colors.textSecondary}
          value={editingCategoryName}
          onChangeText={onCategoryNameChange}
        />
      ) : (
        <Text style={[styles.expenseCategoryName, { color: theme.colors.text }]}>{expense.categoryName}</Text>
      )}

      {isEditing ? (
        <>
          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>🔹 Робота</Text>
            <ClearableTextInput
              containerStyle={{ flex: 1 }}
              style={[
                styles.inlineInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="0"
              placeholderTextColor={theme.colors.textSecondary}
              value={editingLabor}
              onChangeText={onLaborChange}
              keyboardType="numeric"
              autoFocus
            />
            <Text style={[styles.currencyLabel, { color: theme.colors.textSecondary }]}>грн</Text>
          </View>

          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>🔹 Матеріали</Text>
            <ClearableTextInput
              containerStyle={{ flex: 1 }}
              style={[
                styles.inlineInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="0"
              placeholderTextColor={theme.colors.textSecondary}
              value={editingMaterials}
              onChangeText={onMaterialsChange}
              keyboardType="numeric"
            />
            <Text style={[styles.currencyLabel, { color: theme.colors.textSecondary }]}>грн</Text>
          </View>

          <View style={[styles.categoryTotalRow, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.categoryTotalLabel, { color: theme.colors.text }]}>Разом:</Text>
            <Text style={[styles.categoryTotalAmount, { color: emphasisColor }]}>
              {formatCurrency((parseFloat(editingLabor) || 0) + (parseFloat(editingMaterials) || 0))}
            </Text>
          </View>

          <View style={styles.inlineEditActions}>
            <TouchableOpacity
              style={[styles.inlineSaveButton, { backgroundColor: theme.colors.primary }]}
              onPress={onEditSave}
            >
              <Text style={[styles.inlineSaveButtonText, { color: theme.colors.primaryText }]}>Зберегти</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.inlineCancelButton, { backgroundColor: theme.colors.danger + '15' }]}
              onPress={onEditCancel}
            >
              <Text style={[styles.inlineCancelButtonText, { color: theme.colors.danger }]}>Скасувати</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>🔹 Робота</Text>
            <Text style={[styles.inputValue, { color: emphasisColor }]}>{formatCurrency(expense.labor)}</Text>
          </View>

          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>🔹 Матеріали</Text>
            <Text style={[styles.inputValue, { color: emphasisColor }]}>{formatCurrency(expense.materials)}</Text>
          </View>

          <View style={[styles.categoryTotalRow, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.categoryTotalLabel, { color: theme.colors.text }]}>Разом:</Text>
            <Text style={[styles.categoryTotalAmount, { color: emphasisColor }]}>{formatCurrency(categoryTotal)}</Text>
          </View>

          <View style={styles.expenseActions}>
            <TouchableOpacity
              style={[
                styles.editButton,
                {
                  backgroundColor: theme.isDark
                    ? 'rgba(31, 44, 61, 0.55)'
                    : theme.colors.primary,
                  borderColor: theme.isDark ? 'rgba(31, 44, 61, 0.65)' : theme.colors.primary,
                },
              ]}
              onPress={onEditStart}
            >
              <Text style={[styles.editButtonText, { color: theme.colors.primaryText }]}>Редагувати</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: theme.colors.danger + '15' }]}
              onPress={onDelete}
            >
              <Text style={[styles.deleteButtonText, { color: theme.colors.danger }]}>Видалити</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    expenseCard: {
      borderRadius: 12,
      gap: 8,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
    },
    expenseCategoryName: {
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 12,
    },
    expenseCategoryInput: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    inputLabel: {
      fontSize: 14,
      flex: 1,
    },
    inputValue: {
      fontSize: 14,
      fontWeight: '600',
    },
    inlineInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      padding: 8,
      fontSize: 14,
      marginHorizontal: 6,
      textAlign: 'right',
    },
    currencyLabel: {
      fontSize: 14,
      minWidth: 35,
    },
    categoryTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6,
      paddingTop: 10,
      borderTopWidth: 1,
    },
    categoryTotalLabel: {
      fontSize: 14,
      fontWeight: '600',
    },
    categoryTotalAmount: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    expenseActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    editButton: {
      flex: 1,
      borderRadius: 8,
      padding: 8,
      alignItems: 'center',
      borderWidth: 1,
    },
    editButtonText: {
      fontSize: 13,
      fontWeight: '600',
    },
    deleteButton: {
      flex: 1,
      borderRadius: 8,
      padding: 8,
      alignItems: 'center',
    },
    deleteButtonText: {
      fontSize: 13,
      fontWeight: '600',
    },
    inlineEditActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    inlineSaveButton: {
      flex: 1,
      borderRadius: 8,
      padding: 8,
      alignItems: 'center',
    },
    inlineSaveButtonText: {
      fontSize: 13,
      fontWeight: '600',
    },
    inlineCancelButton: {
      flex: 1,
      borderRadius: 8,
      padding: 8,
      alignItems: 'center',
    },
    inlineCancelButtonText: {
      fontSize: 13,
      fontWeight: '600',
    },
  });

