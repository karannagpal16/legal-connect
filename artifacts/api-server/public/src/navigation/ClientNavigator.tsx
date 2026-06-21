import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Placeholder screens
function ClientHomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Client Dashboard</Text>
      <Text style={styles.text}>Book Advocate • View Cases • Get Legal Advice</Text>
    </View>
  );
}

function ClientRemindersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reminders</Text>
    </View>
  );
}

function ClientLibraryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Legal Library</Text>
    </View>
  );
}

function ClientWellnessScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wellness</Text>
    </View>
  );
}

function ClientTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#4169E1',
        tabBarInactiveTintColor: '#666',
        headerStyle: styles.header,
        headerTintColor: 'white',
        headerTitleStyle: styles.headerTitle,
      }}
    >
      <Tab.Screen
        name="Home"
        component={ClientHomeScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen
        name="Reminders"
        component={ClientRemindersScreen}
        options={{
          title: 'Reminders',
          tabBarLabel: 'Reminders',
        }}
      />
      <Tab.Screen
        name="Library"
        component={ClientLibraryScreen}
        options={{
          title: 'Library',
          tabBarLabel: 'Library',
        }}
      />
      <Tab.Screen
        name="Wellness"
        component={ClientWellnessScreen}
        options={{
          title: 'Wellness',
          tabBarLabel: 'Wellness',
        }}
      />
    </Tab.Navigator>
  );
}

export default function ClientNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="ClientTabs"
        component={ClientTabNavigator}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1e2e',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  tabBar: {
    backgroundColor: '#2d2d44',
    borderTopColor: '#444',
    borderTopWidth: 1,
  },
  header: {
    backgroundColor: '#2d2d44',
    borderBottomColor: '#444',
    borderBottomWidth: 1,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
