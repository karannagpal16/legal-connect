import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GatewayScreen } from "../mobile/screens/GatewayScreen";
import ClientNavigator from "./ClientNavigator";
import AdvocateNavigator from "./AdvocateNavigator";
import InternNavigator from "./InternNavigator";

const Stack = createNativeStackNavigator();

/** Root navigation — premium gateway + role apps. Updated existing file. */
export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RoleSelector" component={GatewayScreen} />
      <Stack.Screen name="ClientApp" component={ClientNavigator} />
      <Stack.Screen name="AdvocateApp" component={AdvocateNavigator} />
      <Stack.Screen name="InternApp" component={InternNavigator} />
    </Stack.Navigator>
  );
}
