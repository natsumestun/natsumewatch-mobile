import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { HomeScreen } from "../screens/HomeScreen";
import { CatalogScreen } from "../screens/CatalogScreen";
import { RandomScreen } from "../screens/RandomScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { colors } from "../theme/colors";
import type { TabParamList } from "./types";

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg.panel,
          borderTopColor: colors.bg.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.brand[500],
        tabBarInactiveTintColor: colors.text.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen as never}
        options={{
          title: "Главная",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Catalog"
        component={CatalogScreen}
        options={{
          title: "Каталог",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Random"
        component={RandomScreen}
        options={{
          title: "Случайное",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shuffle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Профиль",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
