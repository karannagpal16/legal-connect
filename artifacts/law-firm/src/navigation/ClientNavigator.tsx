import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ClientHomeScreenNative } from "../mobile/screens/ClientHomeScreenNative";
import { PlaceholderScreen } from "../mobile/components/ui/PlaceholderScreen";
import { roleTabOptions } from "../mobile/theme/navigation";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function ClientTabNavigator() {
  return (
    <Tab.Navigator screenOptions={roleTabOptions("client")}>
      <Tab.Screen name="Home" component={ClientHomeScreenNative} options={{ title: "Dashboard", tabBarLabel: "Home" }} />
      <Tab.Screen name="Reminders" component={() => <PlaceholderScreen title="Reminders" />} options={{ title: "Reminders" }} />
      <Tab.Screen name="Library" component={() => <PlaceholderScreen title="Legal Library" />} options={{ title: "Library" }} />
      <Tab.Screen name="Help" component={() => <PlaceholderScreen title="Legal Help" />} options={{ title: "Help", tabBarLabel: "Help" }} />
    </Tab.Navigator>
  );
}

export default function ClientNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClientTabs" component={ClientTabNavigator} />
    </Stack.Navigator>
  );
}
