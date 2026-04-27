import { useState } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const register = useAuth((s) => s.register);
  const qc = useQueryClient();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (!username || !email || !password) {
      Alert.alert("Заполните поля");
      return;
    }
    setSubmitting(true);
    try {
      await register(username, email, password);
      qc.invalidateQueries();
      navigation.goBack();
    } catch (e) {
      Alert.alert("Не удалось зарегистрироваться", (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

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
        <Text style={styles.title}>Регистрация</Text>

        <Text style={styles.subtitle}>Имя пользователя</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
          placeholder="natsume"
          placeholderTextColor={colors.text.faint}
        />

        <Text style={styles.subtitle}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.text.faint}
        />

        <Text style={styles.subtitle}>Пароль</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
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
            <Text style={styles.btnText}>Создать аккаунт</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => navigation.replace("Login")}
          style={styles.linkBtn}
        >
          <Text style={styles.linkText}>Уже есть аккаунт? Войти</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
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
});
