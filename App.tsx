import 'react-native-screens';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FamilyGroupProvider, useFamilyGroup } from './contexts/FamilyGroupContext';
import AuthScreen from './screens/AuthScreen';
import FamilyGroupScreen from './screens/FamilyGroupScreen';
import ProjectsScreen from './screens/ProjectsScreen';
import ExpensesScreen from './screens/ExpensesScreen';
import SettingsScreen from './screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function MainNavigator() {
  const { user, loading: authLoading } = useAuth();
  const { currentGroup, loading: groupLoading } = useFamilyGroup();

  if (authLoading || groupLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!currentGroup) {
    return <FamilyGroupScreen />;
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStatusBarHeight: 0, // Використовуємо SafeAreaView замість вбудованого padding
        contentStyle: { flex: 1 },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      }}
    >
      <Tab.Screen
        name="Projects"
        component={ProjectsScreen}
        options={{
          title: 'Проекти',
          tabBarLabel: 'Проекти',
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpensesScreen}
        options={{
          title: 'Витрати',
          tabBarLabel: 'Витрати',
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Налаштування',
          tabBarLabel: 'Налаштування',
          tabBarIcon: () => null,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <FamilyGroupProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <MainNavigator />
          </NavigationContainer>
        </FamilyGroupProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
