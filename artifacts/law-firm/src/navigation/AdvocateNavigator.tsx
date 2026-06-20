import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Placeholder screens
function AdvocateDashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Advocate Dashboard</Text>
      <Text style={styles.text}>Manage Clients • Track Cases • View Bookings</Text>
    </View>
  );
}

function AdvocateCallsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calls</Text>
    </View>
  );
}

function AdvocateDiaryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Diary</Text>
    </View>
  );
}

function AdvocateRevenueScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Revenue</Text>
    </View>
  );
}

function AdvocateTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#32CD32',
        tabBarInactiveTintColor: '#666',
        headerStyle: styles.header,
        headerTintColor: 'white',
        headerTitleStyle: styles.headerTitle,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={AdvocateDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="Calls"
        component={AdvocateCallsScreen}
        options={{ title: 'Calls' }}
      />
      <Tab.Screen
        name="Diary"
        component={AdvocateDiaryScreen}
        options={{ title: 'Diary' }}
      />
      <Tab.Screen
        name="Revenue"
        component={AdvocateRevenueScreen}
        options={{ title: 'Revenue' }}
      />
    </Tab.Navigator>
  );
}

export default function AdvocateNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="AdvocateTabs" component={AdvocateTabNavigator} />
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
