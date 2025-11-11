import 'react-native-screens';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import AuthScreen from './screens/AuthScreen';
import ProjectsScreen from './screens/ProjectsScreen';
import ExpensesScreen from './screens/ExpensesScreen';
import SettingsScreen from './screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function MainNavigator() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  if (authLoading) {
    return (
      <SafeAreaView
        style={styles.splashContainer}
        edges={['top', 'bottom']}
      >
        <Image
          source={require('./assets/Splash-logo.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="small" color="#1F2C3D" style={styles.splashSpinner} />
      </SafeAreaView>
    );
  }

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
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ThemeProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6ECF4',
  },
  splashLogo: {
    width: '70%',
    maxWidth: 320,
    aspectRatio: 1,
  },
  splashSpinner: {
    marginTop: 32,
  },
});
