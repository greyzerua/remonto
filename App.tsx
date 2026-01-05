import 'react-native-screens';
import { useEffect } from 'react';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ConfirmDialogProvider } from './contexts/ConfirmDialogContext';
import AuthScreen from './screens/AuthScreen';
import ProjectsScreen from './screens/ProjectsScreen';
import ExpensesScreen from './screens/ExpensesScreen';
import SettingsScreen from './screens/SettingsScreen';
import ToastComponent from './components/Toast';

// Запобігаємо автоматичному приховуванню splash screen
SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();

function MainNavigator() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Приховуємо нативний splash screen після завершення завантаження авторизації
  useEffect(() => {
    if (!authLoading) {
      SplashScreen.hideAsync();
    }
  }, [authLoading]);

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,
        backgroundColor: theme.colors.background,
      }}
    >
    <Tab.Navigator
     
      screenOptions={{
        headerShown: false,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          height: 70 + insets.bottom,
          paddingBottom:
            insets.bottom > 0
              ? insets.bottom
              : Platform.OS === 'ios'
              ? 16
              : 12,
          paddingTop: 12,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          
        },
        tabBarActiveTintColor: theme.isDark ? '#F7FAFF' : '#1F2937',
        tabBarInactiveTintColor: theme.isDark ? 'rgba(226, 232, 240, 0.6)' : 'rgba(30, 27, 75, 0.55)',
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 2,
        },
      }}
    >
      <Tab.Screen
        name="Projects"
        component={ProjectsScreen}
        options={{
          title: 'Проєкти',
          tabBarLabel: 'Проєкти',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="briefcase-outline"
              size={size + 2}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpensesScreen}
        options={{
          title: 'Витрати',
          tabBarLabel: 'Витрати',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="calculator-outline"
              size={size + 2}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Налаштування',
          tabBarLabel: 'Налаштування',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="settings-outline"
              size={size + 2}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
    </View>
  );
}

function AppContent() {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <NavigationContainer
        theme={{
          dark: theme.isDark,
          colors: {
            primary: theme.colors.primary,
            background: theme.colors.background,
            card: theme.colors.background,
            text: theme.colors.text,
            border: theme.colors.border,
            notification: theme.colors.primary,
          },
          fonts: {
            regular: {
              fontFamily: 'System',
              fontWeight: '400' as const,
            },
            medium: {
              fontFamily: 'System',
              fontWeight: '500' as const,
            },
            bold: {
              fontFamily: 'System',
              fontWeight: '700' as const,
            },
            heavy: {
              fontFamily: 'System',
              fontWeight: '800' as const,
            },
          },
        }}
      >
      <ExpoStatusBar
        style={theme.isDark ? 'light' : 'dark'}
        backgroundColor={theme.colors.background}
      />
        <MainNavigator />
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <ThemeProvider>
            <ConfirmDialogProvider>
              <AuthProvider>
                <AppContent />
                <ToastComponent />
              </AuthProvider>
            </ConfirmDialogProvider>
          </ThemeProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

