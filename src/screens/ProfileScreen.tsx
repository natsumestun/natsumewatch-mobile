import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { apiFetch, resolveMediaUrl, API_BASE } from "../api/client";
import { useAuth } from "../store/auth";
import {
  LIST_STATUSES,
  STATUS_LABELS,
  type ListStatus,
  type ListStatusCount,
} from "../api/types";
import { colors, radius, spacing } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const stackNav =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, loading, logout } = useAuth();
  const qc = useQueryClient();

  const countsQ = useQuery<ListStatusCount[]>({
    queryKey: ["my-list-counts"],
    queryFn: () => apiFetch<ListStatusCount[]>("/me/lists/counts"),
    enabled: Boolean(user),
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand[500]} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 32 }]}>
        <Text style={styles.title}>Профиль</Text>
        <Text style={styles.muted}>
          Войдите, чтобы вести списки, оставлять оценки и видеть историю.
        </Text>
        <View style={styles.authActions}>
          <Pressable
            style={styles.btnPrimary}
            onPress={() => stackNav.navigate("Login")}
          >
            <Text style={styles.btnPrimaryText}>Войти</Text>
          </Pressable>
          <Pressable
            style={styles.btnGhost}
            onPress={() => stackNav.navigate("Register")}
          >
            <Text style={styles.btnGhostText}>Регистрация</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const avatar = resolveMediaUrl(user.avatar_url);
  const banner = resolveMediaUrl(user.banner_url);

  const countsByStatus: Record<string, number> = {};
  for (const c of countsQ.data ?? []) countsByStatus[c.status] = c.count;

  const onLogout = () => {
    Alert.alert("Выйти?", "Вернуться можно в любой момент.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Выйти",
        style: "destructive",
        onPress: async () => {
          await logout();
          qc.clear();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      <View style={styles.bannerWrap}>
        {banner ? (
          <Image source={{ uri: banner }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.bg.panel }]} />
        )}
        <View style={styles.bannerFade} pointerEvents="none" />
        <Pressable
          style={[styles.logoutBtn, { top: insets.top + 8 }]}
          onPress={onLogout}
          hitSlop={10}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.profileHead}>
        <View style={styles.avatarWrap}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarFallbackText}>
                {user.username?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.username}>{user.username}</Text>
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <Text style={styles.sectionTitle}>Мои списки</Text>
      <View style={styles.listsGrid}>
        {LIST_STATUSES.map((status) => (
          <Pressable
            key={status}
            style={styles.listCard}
            onPress={() => stackNav.navigate("MyList", { status })}
          >
            <Text style={styles.listLabel}>{STATUS_LABELS[status]}</Text>
            <Text style={styles.listCount}>{countsByStatus[status] ?? 0}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.serverHint}>API: {API_BASE.replace(/^https?:\/\//, "")}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
    padding: spacing.lg,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg.base,
  },
  title: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: "800",
  },
  muted: {
    color: colors.text.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  authActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  btnPrimary: {
    backgroundColor: colors.brand[500],
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: radius.md,
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  btnGhost: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  btnGhostText: {
    color: colors.text.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  bannerWrap: {
    position: "relative",
    height: 160,
    backgroundColor: colors.bg.panel,
  },
  bannerFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,6,19,0.45)",
  },
  logoutBtn: {
    position: "absolute",
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileHead: {
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    marginTop: -36,
    alignItems: "flex-start",
    gap: 6,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.bg.base,
    overflow: "hidden",
    backgroundColor: colors.bg.panel,
  },
  avatar: {
    flex: 1,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand[600],
  },
  avatarFallbackText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
  },
  username: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 8,
  },
  bio: {
    color: colors.text.secondary,
    fontSize: 13,
  },
  email: {
    color: colors.text.muted,
    fontSize: 12,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 24,
    paddingHorizontal: spacing.lg,
  },
  listsGrid: {
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  listCard: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: colors.bg.panel,
    borderWidth: 1,
    borderColor: colors.bg.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  listLabel: {
    color: colors.text.muted,
    fontSize: 12,
  },
  listCount: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: "800",
  },
  serverHint: {
    marginTop: 24,
    color: colors.text.faint,
    fontSize: 11,
    paddingHorizontal: spacing.lg,
  },
});
