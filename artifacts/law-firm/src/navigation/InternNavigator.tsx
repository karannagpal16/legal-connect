import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Placeholder screens
function InternQuestsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quests</Text>
      <Text style={styles.text}>Complete Tasks • Earn XP • Level Up</Text>
    </View>
  );
}

function InternXPScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Experience</Text>
    </View>
  );
}

function InternBadgesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Badges</Text>
    </View>
  );
}

function InternLibraryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Library</Text>
    </View>
  );
}

function InternTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#FF8C00',
        tabBarInactiveTintColor: '#666',
        headerStyle: styles.header,
        headerTintColor: 'white',
        headerTitleStyle: styles.headerTitle,
      }}
    >
      <Tab.Screen
        name="Quests"
        component={InternQuestsScreen}
        options={{ title: 'Quests' }}
      />
      <Tab.Screen
        name="XP"
        component={InternXPScreen}
        options={{ title: 'Experience' }}
      />
      <Tab.Screen
        name="Badges"
        component={InternBadgesScreen}
        options={{ title: 'Badges' }}
      />
      <Tab.Screen
        name="Library"
        component={InternLibraryScreen}
        options={{ title: 'Library' }}
      />
    </Tab.Navigator>
  );
}

export default function InternNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="InternTabs" component={InternTabNavigator} />
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
