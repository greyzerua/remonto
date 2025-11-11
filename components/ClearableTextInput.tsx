import React, { ComponentType, ForwardRefExoticComponent, forwardRef, useContext } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../contexts/ThemeContext';

type InputComponentType =
  | ComponentType<TextInputProps>
  | ForwardRefExoticComponent<TextInputProps & React.RefAttributes<TextInput>>;

export interface ClearableTextInputProps extends TextInputProps {
  InputComponent?: InputComponentType;
  containerStyle?: StyleProp<ViewStyle>;
  clearIconColor?: string;
  clearIconSize?: number;
  showClearIcon?: boolean;
  onClear?: () => void;
}

const ClearableTextInput = forwardRef<TextInput, ClearableTextInputProps>(
  (
    {
      InputComponent = TextInput,
      containerStyle,
      clearIconColor,
      clearIconSize = 24,
      showClearIcon = true,
      onClear,
      style,
      value,
      onChangeText,
      editable,
      ...rest
    },
    ref
  ) => {
    const themeContext = useContext(ThemeContext);
    const themeColors = themeContext?.theme.colors;
    const hasValue =
      typeof value === 'string' ? value.length > 0 : value !== undefined && value !== null;
    const shouldShowClear = showClearIcon && hasValue && editable !== false;
    const resolvedIconColor = clearIconColor ?? themeColors?.textSecondary ?? '#94A3B8';

    const handleClear = () => {
      if (onChangeText) {
        onChangeText('');
      }

    };

    return (
      <View style={[styles.container, containerStyle]}>
        <InputComponent
          {...rest}
          ref={ref as any}
          value={value}
          style={[style, shouldShowClear ? styles.inputWithIcon : null]}
          onChangeText={onChangeText}
          editable={editable}
        />
        {shouldShowClear ? (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.iconWrapper}
      
            accessibilityRole="button"
            accessibilityLabel="Очистити поле"
          >
            <Ionicons
              name="close"
              size={clearIconSize}
              color={resolvedIconColor}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }
);

ClearableTextInput.displayName = 'ClearableTextInput';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  
    flexGrow: 1,
    justifyContent: 'center',
  },
  iconWrapper: {
    position: 'absolute',
    
    alignItems: 'center',
    justifyContent: 'center',
    right: 12,
  },
  inputWithIcon: {
    paddingRight: 40,
  },
});

export default ClearableTextInput;

