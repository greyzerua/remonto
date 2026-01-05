import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import { useTheme } from '../contexts/ThemeContext';
import { Expense } from '../types';
import { formatCurrency } from '../utils/helpers';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from './BottomSheet';
import ClearableTextInput from './ClearableTextInput';

interface ExpenseFormValues {
  categoryName: string;
  labor: string;
  materials: string;
}

interface ExpenseModalProps {
  visible: boolean;
  editingExpense: Expense | null;
  control: Control<ExpenseFormValues>;
  errors: FieldErrors<ExpenseFormValues>;
  isSubmitting: boolean;
  modalTotalAmount: number;
  bottomSheetSnapPoints: number[];
  bottomSheetContentMaxHeight: number;
  onClose: () => void;
  onSubmit: () => void;
}

export default function ExpenseModal({
  visible,
  editingExpense,
  control,
  errors,
  isSubmitting,
  modalTotalAmount,
  bottomSheetSnapPoints,
  bottomSheetContentMaxHeight,
  onClose,
  onSubmit,
}: ExpenseModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const emphasisColor = theme.isDark ? theme.colors.primaryText : theme.colors.primary;
  const styles = createStyles(theme.colors);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      enablePanDownToClose={true}
      enableBackdrop={true}
      snapPoints={bottomSheetSnapPoints}
      backdropOpacity={0.5}
    >
      <View style={styles.bottomSheetWrapper}>
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          contentContainerStyle={styles.bottomSheetScrollContent}
          showsVerticalScrollIndicator={true}
          bounces={false}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            {editingExpense ? 'Редагувати категорію' : 'Нова категорію'}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Назва категорії *</Text>
            <Controller
              control={control}
              name="categoryName"
              render={({ field: { value, onChange, onBlur } }) => (
                <ClearableTextInput
                  InputComponent={BottomSheetTextInput}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: errors.categoryName ? theme.colors.danger : theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="Наприклад: Монтаж кухні"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={value ?? ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
              )}
            />
            {errors.categoryName && (
              <Text style={[styles.errorText, { color: theme.colors.danger }]}>{errors.categoryName.message}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>🔹 Робота (₴)</Text>
            <Controller
              control={control}
              name="labor"
              render={({ field: { value, onChange, onBlur } }) => (
                <ClearableTextInput
                  InputComponent={BottomSheetTextInput}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: errors.labor ? theme.colors.danger : theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={value ?? ''}
                  onChangeText={(text) => onChange(text.replace(/[^0-9.,]/g, ''))}
                  onBlur={onBlur}
                  keyboardType="numeric"
                />
              )}
            />
            {errors.labor && <Text style={[styles.errorText, { color: theme.colors.danger }]}>{errors.labor.message}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>🔹 Матеріали (₴)</Text>
            <Controller
              control={control}
              name="materials"
              render={({ field: { value, onChange, onBlur } }) => (
                <ClearableTextInput
                  InputComponent={BottomSheetTextInput}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: errors.materials ? theme.colors.danger : theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={value ?? ''}
                  onChangeText={(text) => onChange(text.replace(/[^0-9.,]/g, ''))}
                  onBlur={onBlur}
                  keyboardType="numeric"
                />
              )}
            />
            {errors.materials && (
              <Text style={[styles.errorText, { color: theme.colors.danger }]}>{errors.materials.message}</Text>
            )}
          </View>

          <View style={[styles.modalTotalRow, { backgroundColor: theme.colors.primary + '15' }]}>
            <Text style={[styles.modalTotalLabel, { color: theme.colors.text }]}>Разом:</Text>
            <Text style={[styles.modalTotalAmount, { color: emphasisColor }]}>{formatCurrency(modalTotalAmount)}</Text>
          </View>
        </BottomSheetScrollView>

        <View
          style={[
            styles.bottomSheetActionsContainer,
            {
              borderTopColor: theme.colors.border,
              borderTopWidth: 1,
              backgroundColor: theme.colors.surface,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.cancelButton,
                {
                  backgroundColor: theme.isDark ? 'rgba(51, 65, 85, 0.5)' : '#f1f5f9',
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Скасувати</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
              onPress={onSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={theme.colors.primaryText} />
              ) : (
                <Text style={[styles.saveButtonText, { color: theme.colors.primaryText }]}>Зберегти</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    bottomSheetWrapper: {
      flex: 1,
      flexDirection: 'column',
    },
    bottomSheetScrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 24,
    },
    bottomSheetActionsContainer: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    inputContainer: {
      marginBottom: 10,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
    },
    modalTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderRadius: 8,
    },
    modalTotalLabel: {
      fontSize: 16,
      fontWeight: '600',
    },
    modalTotalAmount: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
    },
    modalButton: {
      flex: 1,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
    },
    errorText: {
      fontSize: 12,
      marginTop: 6,
    },
    cancelButton: {
      borderWidth: 1,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    saveButton: {},
    saveButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });

