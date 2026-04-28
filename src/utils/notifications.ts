import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { apiFetch } from "../api/client";

const PUSH_TOKEN_KEY = "push:expo_token";
const PREFS_KEY = "push:prefs:v1";

export type NotificationPrefs = {
  enabled: boolean;
  newEpisodes: boolean;
  chatMessages: boolean;
  friendRequests: boolean;
};

export const DEFAULT_PREFS: NotificationPrefs = {
  enabled: true,
  newEpisodes: true,
  chatMessages: true,
  friendRequests: true,
};

export async function loadPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function savePrefs(prefs: NotificationPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Основной",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 200, 200],
      lightColor: "#a855f7",
    });
    await Notifications.setNotificationChannelAsync("episodes", {
      name: "Новые серии",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 200, 200],
      lightColor: "#a855f7",
    });
    await Notifications.setNotificationChannelAsync("chat", {
      name: "Сообщения",
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync("friends", {
      name: "Заявки в друзья",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch {
    /* ignore */
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  if (settings.canAskAgain === false) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;
  await ensureAndroidChannel();
  const granted = await requestNotificationPermissions();
  if (!granted) return null;
  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
      ?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig
      ?.projectId;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenData.data ?? null;
  } catch {
    return null;
  }
}

export async function syncPushTokenWithBackend(): Promise<string | null> {
  const token = await registerForPushNotificationsAsync();
  if (!token) return null;

  const cached = await AsyncStorage.getItem(PUSH_TOKEN_KEY).catch(() => null);
  if (cached === token) return token;

  // Best effort: backend may not implement the endpoint yet — silently swallow.
  try {
    await apiFetch("/me/push-tokens", {
      method: "POST",
      body: JSON.stringify({
        token,
        platform: Platform.OS,
      }),
    });
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token).catch(() => undefined);
  } catch {
    /* backend endpoint not yet available */
  }
  return token;
}

export async function clearPushToken(): Promise<void> {
  const cached = await AsyncStorage.getItem(PUSH_TOKEN_KEY).catch(() => null);
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY).catch(() => undefined);
  if (!cached) return;
  try {
    await apiFetch(`/me/push-tokens?token=${encodeURIComponent(cached)}`, {
      method: "DELETE",
    });
  } catch {
    /* ignore */
  }
}

export async function presentLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  channelId?: string,
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data ?? {},
        ...(Platform.OS === "android" && channelId
          ? { channelId }
          : {}),
      },
      trigger: null,
    });
  } catch {
    /* ignore */
  }
}
