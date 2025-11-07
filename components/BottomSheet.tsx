import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, Dimensions, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';

// Експортуємо BottomSheetScrollView та BottomSheetTextInput для використання в екранах
export { BottomSheetScrollView, BottomSheetTextInput };

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[]; // Висоти для snap points (опціонально)
  enablePanDownToClose?: boolean; // Дозволити закриття свайпом вниз
  enableBackdrop?: boolean; // Показати бекдроп
  backdropOpacity?: number; // Прозорість бекдропу (0-1)
  animationConfig?: {
    damping?: number;
    stiffness?: number;
    mass?: number;
  };
  maxHeight?: number; // Максимальна висота (відсоток від екрану)
  minHeight?: number; // Мінімальна висота
}

const DEFAULT_BACKDROP_OPACITY = 0.5;
const DEFAULT_MAX_HEIGHT = 0.8;

export default function BottomSheet({
  visible,
  onClose,
  children,
  snapPoints,
  enablePanDownToClose = true,
  enableBackdrop = true,
  backdropOpacity = DEFAULT_BACKDROP_OPACITY,
  animationConfig,
  maxHeight = DEFAULT_MAX_HEIGHT,
  minHeight = 0,
}: BottomSheetProps) {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const { height: screenHeight } = Dimensions.get('window');
  const insets = useSafeAreaInsets();

  // Обчислюємо snapPoints
  const defaultSnapPoints = useMemo(() => {
    if (snapPoints && snapPoints.length > 0) {
      // Якщо snapPoints вказані як числа, конвертуємо їх у відсотки
      return snapPoints.map((point) => {
        if (point > 1) {
          // Якщо це пікселі, конвертуємо у відсотки
          return `${Math.round((point / screenHeight) * 100)}%`;
        }
        // Якщо це вже відсоток (0-1), конвертуємо у рядок
        return `${Math.round(point * 100)}%`;
      });
    }
    // Якщо snapPoints не вказані, використовуємо maxHeight у відсотках
    // Використовуємо один snapPoint для стабільності
    const maxHeightPercent = Math.round(maxHeight * 100);
    return [`${maxHeightPercent}%`];
  }, [snapPoints, screenHeight, maxHeight]);

  // Мемоізуємо максимальний розмір контенту
  const maxDynamicContentSize = useMemo(() => {
    return screenHeight - insets.top - 60;
  }, [screenHeight, insets.top]);

  // Синхронізуємо visible з present/dismiss
  useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible]);

  // Обробка подій клавіатури для коректного опускання BottomSheet
  const handleKeyboardHide = useCallback(() => {
    // Повертаємо BottomSheet до початкового snapPoint після закриття клавіатури
    setTimeout(() => {
      bottomSheetModalRef.current?.snapToIndex(0);
    }, 100);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      handleKeyboardHide
    );

    return () => {
      keyboardWillHide.remove();
    };
  }, [visible, handleKeyboardHide]);

  // Обробка змін стану bottom sheet
  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        // Bottom sheet закрито
        onClose();
      }
    },
    [onClose]
  );

  // Рендер бекдропу
  const renderBackdrop = useCallback(
    (props: any) => {
      if (!enableBackdrop) {
        return null;
      }
      return (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={backdropOpacity}
        />
      );
    },
    [enableBackdrop, backdropOpacity]
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={defaultSnapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={enablePanDownToClose}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      enableDynamicSizing={false}
      enableHandlePanningGesture={enablePanDownToClose}
      enableContentPanningGesture={false}
      activeOffsetY={[-1, 1]}
      failOffsetX={[-5, 5]}
      enableOverDrag={false}
      animateOnMount={true}
      topInset={insets.top}
      maxDynamicContentSize={maxDynamicContentSize}
    >
      <BottomSheetView style={styles.contentContainer}>
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
});
