import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AdvocateHomeScreenNative } from "../mobile/screens/AdvocateHomeScreenNative";
import { PlaceholderScreen } from "../mobile/components/ui/PlaceholderScreen";
import { roleTabOptions } from "../mobile/theme/navigation";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AdvocateTabNavigator() {
  return (
    <Tab.Navigator screenOptions={roleTabOptions("advocate")}>
      <Tab.Screen name="Dashboard" component={AdvocateHomeScreenNative} options={{ title: "Today", tabBarLabel: "Today" }} />
      <Tab.Screen name="Diary" component={() => <PlaceholderScreen title="Case Diary" />} options={{ title: "Diary" }} />
      <Tab.Screen name="Court" component={() => <PlaceholderScreen title="Court Desk" />} options={{ title: "Court", tabBarLabel: "Court" }} />
      <Tab.Screen name="Chamber" component={() => <PlaceholderScreen title="Chamber Mode" />} options={{ title: "Chamber" }} />
    </Tab.Navigator>
  );
}

export default function AdvocateNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdvocateTabs" component={AdvocateTabNavigator} />
    </Stack.Navigator>
  );
}
