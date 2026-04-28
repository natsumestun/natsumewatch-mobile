import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import { apiFetch, API_BASE } from "../api/client";
import { useAuth } from "../store/auth";
import type { AuthProviders } from "../api/types";
import { colors, radius, spacing } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEYS = [
  "auth_token",
  "access_token",
  "token",
  "jwt",
];

function parseKeyValueString(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!s) return out;
  for (const part of s.split("&")) {
    if (!part) continue;
    const idx = part.indexOf("=");
    const key = idx >= 0 ? part.slice(0, idx) : part;
    const val = idx >= 0 ? part.slice(idx + 1) : "";
    try {
      out[decodeURIComponent(key)] = decodeURIComponent(val.replace(/\+/g, " "));
    } catch {
      out[key] = val;
    }
  }
  return out;
}

function extractAuthToken(rawUrl: string): string {
  if (!rawUrl) return "";
  const hashIdx = rawUrl.indexOf("#");
  const fragment = hashIdx >= 0 ? rawUrl.slice(hashIdx + 1) : "";
  const queryIdx = rawUrl.indexOf("?");
  const queryEnd = hashIdx >= 0 ? hashIdx : rawUrl.length;
  const query = queryIdx >= 0 ? rawUrl.slice(queryIdx + 1, queryEnd) : "";
  const fragParams = parseKeyValueString(fragment);
  const queryParams = parseKeyValueString(query);
  for (const key of TOKEN_KEYS) {
    if (fragParams[key]) return fragParams[key];
    if (queryParams[key]) return queryParams[key];
  }
  return "";
}

export function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const login = useAuth((s) => s.login);
  const loginWithToken = useAuth((s) => s.loginWithToken);
  const qc = useQueryClient();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [providers, setProviders] = useState<AuthProviders>({});
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<AuthProviders>("/auth/providers", { skipAuth: true })
      .then((p) => setProviders(p || {}))
      .catch(() => setProviders({}));
  }, []);

  async function startOAuth(provider: string) {
    setOauthLoading(provider);
    try {
      const redirect = Linking.createURL("auth-callback");
      const startUrl = `${API_BASE}/api/auth/${provider}/start?return_to=${encodeURIComponent(redirect)}`;
      const result = await WebBrowser.openAuthSessionAsync(startUrl, redirect);
      if (result.type === "success" && result.url) {
        const token = extractAuthToken(result.url);
        if (!token) {
          throw new Error("Сервер не вернул токен");
        }
        await loginWithToken(token);
        qc.invalidateQueries();
        navigation.goBack();
      } else if (result.type !== "cancel" && result.type !== "dismiss") {
        throw new Error("Не удалось завершить вход");
      }
    } catch (e) {
      Alert.alert(`${provider} OAuth`, (e as Error).message);
    } finally {
      setOauthLoading(null);
    }
  }

  async function onSubmit() {
    if (!emailOrUsername || !password) {
      Alert.alert("Заполните поля");
      return;
    }
    setSubmitting(true);
    try {
      await login(emailOrUsername, password);
      qc.invalidateQueries();
      navigation.goBack();
    } catch (e) {
      Alert.alert("Не удалось войти", (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const enabledProviders = Object.entries(providers).filter(([, on]) => on);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>Вход</Text>
        <Text style={styles.subtitle}>Email или имя пользователя</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          value={emailOrUsername}
          onChangeText={setEmailOrUsername}
          placeholder="you@example.com"
          placeholderTextColor={colors.text.faint}
        />
        <Text style={styles.subtitle}>Пароль</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.text.faint}
        />

        <Pressable
          style={[styles.btn, submitting && { opacity: 0.6 }]}
          disabled={submitting}
          onPress={onSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Войти</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => navigation.replace("Register")}
          style={styles.linkBtn}
        >
          <Text style={styles.linkText}>Нет аккаунта? Зарегистрироваться</Text>
        </Pressable>

        {enabledProviders.length ? (
          <View style={styles.oauthBlock}>
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>или</Text>
              <View style={styles.divider} />
            </View>
            {enabledProviders.map(([provider]) => (
              <Pressable
                key={provider}
                style={styles.oauthBtn}
                disabled={oauthLoading !== null}
                onPress={() => startOAuth(provider)}
              >
                {oauthLoading === provider ? (
                  <ActivityIndicator color={colors.text.primary} />
                ) : (
                  <>
                    <Ionicons
                      name={
                        provider === "google"
                          ? "logo-google"
                          : provider === "discord"
                            ? "logo-discord"
                            : "log-in-outline"
                      }
                      size={18}
                      color={colors.text.primary}
                    />
                    <Text style={styles.oauthBtnText}>
                      Войти через {capitalize(provider)}
                    </Text>
                  </>
                )}
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: 6,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  title: {
    color: colors.text.primary,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 24,
  },
  subtitle: {
    color: colors.text.muted,
    fontSize: 13,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.bg.panel,
    borderWidth: 1,
    borderColor: colors.bg.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text.primary,
    fontSize: 15,
  },
  btn: {
    marginTop: 24,
    backgroundColor: colors.brand[500],
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  linkBtn: {
    marginTop: 16,
    alignItems: "center",
  },
  linkText: {
    color: colors.text.muted,
    fontSize: 13,
  },
  oauthBlock: {
    marginTop: 28,
    gap: 10,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.bg.border,
  },
  dividerText: {
    color: colors.text.faint,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  oauthBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
    backgroundColor: colors.bg.panel,
  },
  oauthBtnText: {
    color: colors.text.primary,
    fontWeight: "600",
    fontSize: 14,
  },
});
