import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TabNavigator } from "./TabNavigator";
import { AnimeScreen } from "../screens/AnimeScreen";
import { PlayerScreen } from "../screens/PlayerScreen";
import { KodikPlayerScreen } from "../screens/KodikPlayerScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { MyListScreen } from "../screens/MyListScreen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="Anime" component={AnimeScreen} />
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{ orientation: "all", animation: "fade" }}
      />
      <Stack.Screen
        name="KodikPlayer"
        component={KodikPlayerScreen}
        options={{ orientation: "all", animation: "fade" }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="MyList" component={MyListScreen} />
    </Stack.Navigator>
  );
}
