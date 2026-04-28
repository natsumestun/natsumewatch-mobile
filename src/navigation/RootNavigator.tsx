import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TabNavigator } from "./TabNavigator";
import { AnimeScreen } from "../screens/AnimeScreen";
import { PlayerScreen } from "../screens/PlayerScreen";
import { KodikPlayerScreen } from "../screens/KodikPlayerScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { MyListScreen } from "../screens/MyListScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { StatsScreen } from "../screens/StatsScreen";
import { FriendsScreen } from "../screens/FriendsScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { TorrentsScreen } from "../screens/TorrentsScreen";
import { CommentsScreen } from "../screens/CommentsScreen";
import { ReviewsScreen } from "../screens/ReviewsScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
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
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Stats" component={StatsScreen} />
      <Stack.Screen name="Friends" component={FriendsScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Torrents" component={TorrentsScreen} />
      <Stack.Screen name="Comments" component={CommentsScreen} />
      <Stack.Screen name="Reviews" component={ReviewsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
