import { useEffect } from "react";
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts, Rubik_400Regular, Rubik_600SemiBold, Rubik_700Bold, Rubik_800ExtraBold } from "@expo-google-fonts/rubik";
import * as NavigationBar from "expo-navigation-bar";
import * as SystemUI from "expo-system-ui";

import { RootNavigator } from "./src/navigation/RootNavigator";
import { useAuth } from "./src/store/auth";
import { colors } from "./src/theme/colors";
import { Loading } from "./src/components/Loading";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
});

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg.base,
    card: colors.bg.panel,
    border: colors.bg.border,
    primary: colors.brand[500],
    text: colors.text.primary,
  },
};

export default function App() {
  const init = useAuth((s) => s.init);
  const [fontsLoaded] = useFonts({
    Rubik_400Regular,
    Rubik_600SemiBold,
    Rubik_700Bold,
    Rubik_800ExtraBold,
  });

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg.base).catch(() => undefined);
    if (Platform.OS === "android") {
      void NavigationBar.setBackgroundColorAsync(colors.bg.base).catch(
        () => undefined,
      );
      void NavigationBar.setButtonStyleAsync("light").catch(() => undefined);
      void NavigationBar.setBehaviorAsync("overlay-swipe").catch(
        () => undefined,
      );
      void NavigationBar.setVisibilityAsync("hidden").catch(() => undefined);
    }
  }, []);

  if (!fontsLoaded) {
    return <Loading />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg.base }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <NavigationContainer theme={navTheme}>
            <RootNavigator />
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
