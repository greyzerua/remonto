import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
const DEFAULT_MAX_HEIGHT = 0.9; // 90% від висоти екрану

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
  const insets = useSafeAreaInsets();
  const { height: screenHeightValue } = Dimensions.get('window');
  
  // Анімовані значення
  const translateY = useRef(new Animated.Value(screenHeightValue)).current;
  const backdropOpacityAnim = useRef(new Animated.Value(0)).current;
  
  // Стани
  const [screenHeight, setScreenHeight] = useState(screenHeightValue);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const panStartY = useRef(0);
  const currentTranslateY = useRef(screenHeightValue);
  const isRenderedRef = useRef(false);
  const prevVisibleRef = useRef(visible);
  
  // Ініціалізуємо shouldRender якщо visible вже true при монтуванні
  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      isRenderedRef.current = true;
      prevVisibleRef.current = true;
    }
  }, []);

  // Функція закриття
  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  // Анімація відкриття/закриття
  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (visible && !wasVisible) {
      // Відкриття: показуємо компонент перед анімацією
      setShouldRender(true);
      setIsAnimating(true);
      isRenderedRef.current = true;
      
      const initialHeight = sheetHeight > 0 ? sheetHeight : screenHeight;
      translateY.setValue(initialHeight);
      backdropOpacityAnim.setValue(0);
      currentTranslateY.current = initialHeight;

      // Невелика затримка для правильного рендерингу
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }),
          Animated.timing(backdropOpacityAnim, {
            toValue: backdropOpacity,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          currentTranslateY.current = 0;
          setIsAnimating(false);
        });
      });
    } else if (!visible && wasVisible) {
      // Закриття: запускаємо анімацію тільки якщо компонент був відкритий
      // Перевіряємо через ref, щоб отримати актуальне значення
      if (isRenderedRef.current) {
        setIsAnimating(true);
        const closeHeight = sheetHeight > 0 ? sheetHeight : screenHeight;
        
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: closeHeight,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }),
          Animated.timing(backdropOpacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          currentTranslateY.current = closeHeight;
          setIsAnimating(false);
          setShouldRender(false);
          isRenderedRef.current = false;
        });
      }
    }
  }, [visible, backdropOpacity, screenHeight, sheetHeight]);

  // Обробка клавіатури
  useEffect(() => {
    if (!visible || !shouldRender) return;

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.timing(translateY, {
          toValue: -e.endCoordinates.height / 2,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          currentTranslateY.current = -e.endCoordinates.height / 2;
        });
      }
    );

    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          currentTranslateY.current = 0;
        });
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [visible, shouldRender]);

  // PanResponder для свайпу вниз
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enablePanDownToClose && visible,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return enablePanDownToClose && visible && Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        panStartY.current = currentTranslateY.current;
        translateY.setOffset(currentTranslateY.current);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const newTranslateY = panStartY.current + gestureState.dy;
        
        // Дозволяємо тільки рух вниз
        if (newTranslateY >= 0) {
          translateY.setValue(gestureState.dy);
          
          // Зменшуємо прозорість бекдропу при свайпі вниз
          const progress = Math.min(newTranslateY / (sheetHeight || screenHeight), 1);
          backdropOpacityAnim.setValue(backdropOpacity * (1 - progress));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateY.flattenOffset();
        const threshold = (sheetHeight || screenHeight) * 0.3; // 30% висоти для закриття
        
        if (gestureState.dy > threshold && enablePanDownToClose) {
          // Закриваємо, якщо свайпнули достатньо вниз
          setIsAnimating(true);
          const closeHeight = sheetHeight > 0 ? sheetHeight : screenHeight;
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: closeHeight,
              useNativeDriver: true,
              tension: 50,
              friction: 7,
            }),
            Animated.timing(backdropOpacityAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            currentTranslateY.current = closeHeight;
            setIsAnimating(false);
            setShouldRender(false);
            isRenderedRef.current = false;
            handleClose();
          });
        } else {
          // Повертаємо на місце
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 50,
              friction: 7,
            }),
            Animated.timing(backdropOpacityAnim, {
              toValue: backdropOpacity,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            currentTranslateY.current = 0;
          });
        }
      },
    })
  ).current;

  // Вимірювання висоти контенту
  const handleContentLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    const maxHeightPixels = screenHeight * maxHeight;
    const minHeightPixels = minHeight;
    
    const calculatedHeight = Math.max(
      minHeightPixels,
      Math.min(height + insets.bottom, maxHeightPixels)
    );
    
    setSheetHeight(calculatedHeight);
  };

  // Вимірювання висоти екрану
  const handleScreenLayout = (event: any) => {
    setScreenHeight(event.nativeEvent.layout.height);
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.container} onLayout={handleScreenLayout}>
        {/* Бекдроп */}
        {enableBackdrop && (
          <TouchableWithoutFeedback onPress={handleClose}>
            <Animated.View
              style={[
                styles.backdrop,
                {
                  opacity: backdropOpacityAnim,
                },
              ]}
            />
          </TouchableWithoutFeedback>
        )}

        {/* BottomSheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom,
              maxHeight: screenHeight * maxHeight,
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Індикатор свайпу */}
          {enablePanDownToClose && (
            <View style={styles.dragIndicator} />
          )}

          {/* Контент */}
          <View
            style={styles.content}
            onLayout={handleContentLayout}
          >
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
});
