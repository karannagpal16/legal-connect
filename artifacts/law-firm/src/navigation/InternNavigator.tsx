import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { InternHomeScreenNative } from "../mobile/screens/InternHomeScreenNative";
import { PlaceholderScreen } from "../mobile/components/ui/PlaceholderScreen";
import { roleTabOptions } from "../mobile/theme/navigation";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function InternTabNavigator() {
  return (
    <Tab.Navigator screenOptions={roleTabOptions("intern")}>
      <Tab.Screen name="Quests" component={InternHomeScreenNative} options={{ title: "Quests" }} />
      <Tab.Screen name="Tasks" component={() => <PlaceholderScreen title="My Tasks" />} options={{ title: "Tasks" }} />
      <Tab.Screen name="Learn" component={() => <PlaceholderScreen title="Learn Track" />} options={{ title: "Learn" }} />
      <Tab.Screen name="Rewards" component={() => <PlaceholderScreen title="Rewards Board" />} options={{ title: "Rewards" }} />
    </Tab.Navigator>
  );
}

export default function InternNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InternTabs" component={InternTabNavigator} />
    </Stack.Navigator>
  );
}
