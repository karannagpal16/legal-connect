import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import ClientNavigator from './ClientNavigator';
import AdvocateNavigator from './AdvocateNavigator';
import InternNavigator from './InternNavigator';

type UserRole = 'client' | 'advocate' | 'intern';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function RoleSelector({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Legal Connect</Text>
      <Text style={styles.subtitle}>Select your role</Text>

      <Pressable
        style={[styles.button, styles.clientButton]}
        onPress={() => navigation.navigate('ClientApp')}
      >
        <Text style={styles.buttonText}>I'm a Client</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.advocateButton]}
        onPress={() => navigation.navigate('AdvocateApp')}
      >
        <Text style={styles.buttonText}>I'm an Advocate</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.internButton]}
        onPress={() => navigation.navigate('InternApp')}
      >
        <Text style={styles.buttonText}>I'm an Intern</Text>
      </Pressable>
    </View>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="RoleSelector"
        component={RoleSelector}
        options={{ title: 'Legal Connect' }}
      />
      <Stack.Screen
        name="ClientApp"
        component={ClientNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdvocateApp"
        component={AdvocateNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="InternApp"
        component={InternNavigator}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#1e1e2e',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  clientButton: {
    backgroundColor: '#4169E1',
  },
  advocateButton: {
    backgroundColor: '#32CD32',
  },
  internButton: {
    backgroundColor: '#FF8C00',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
