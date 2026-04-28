import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import * as ImagePicker from "expo-image-picker";

import { apiFetch, resolveMediaUrl, API_BASE, uploadMultipart } from "../api/client";
import { useAuth } from "../store/auth";
import {
  LIST_STATUSES,
  STATUS_LABELS,
  type ListStatusCount,
  type User,
} from "../api/types";
import { colors, radius, spacing } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const stackNav =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, loading, logout, setUser } = useAuth();
  const qc = useQueryClient();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [pickerOpen, setPickerOpen] = useState<null | "avatar" | "banner">(null);

  async function pickAndUpload(kind: "avatar" | "banner") {
    const aspect: [number, number] = kind === "avatar" ? [1, 1] : [3, 1];
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Нужен доступ к фото", "Разрешите доступ в настройках.");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect,
      quality: 0.9,
    });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    const uri = a.uri;
    const filename = a.fileName || `${kind}-${Date.now()}.jpg`;
    const mime = a.mimeType || "image/jpeg";
    const setBusy = kind === "avatar" ? setUploadingAvatar : setUploadingBanner;
    setBusy(true);
    try {
      const updated = await uploadMultipart<User>(
        kind === "avatar" ? "/me/avatar" : "/me/banner",
        "file",
        uri,
        filename,
        mime,
      );
      setUser(updated);
    } catch (e) {
      Alert.alert("Не удалось загрузить", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeMedia(kind: "avatar" | "banner") {
    const setBusy = kind === "avatar" ? setUploadingAvatar : setUploadingBanner;
    setBusy(true);
    try {
      const updated = await apiFetch<User>(
        kind === "avatar" ? "/me/avatar" : "/me/banner",
        { method: "DELETE" },
      );
      setUser(updated);
    } catch (e) {
      Alert.alert("Не удалось удалить", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onAvatarPress() {
    if (!user) return;
    setPickerOpen("avatar");
  }

  function onBannerPress() {
    if (!user) return;
    setPickerOpen("banner");
  }

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

  const pickerHasMedia =
    pickerOpen === "avatar"
      ? Boolean(user.avatar_url)
      : pickerOpen === "banner"
      ? Boolean(user.banner_url)
      : false;
  const pickerTitle =
    pickerOpen === "avatar" ? "Аватар" : pickerOpen === "banner" ? "Баннер" : "";
  const pickerHint =
    pickerOpen === "avatar"
      ? "Квадратная картинка, до 8 МБ"
      : pickerOpen === "banner"
      ? "Широкая картинка 3:1, до 8 МБ"
      : "";

  return (
    <>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      <Pressable style={styles.bannerWrap} onPress={onBannerPress}>
        {banner ? (
          <Image source={{ uri: banner }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.bg.panel }]} />
        )}
        <View style={styles.bannerFade} pointerEvents="none" />
        {uploadingBanner ? (
          <View style={styles.uploadOverlay} pointerEvents="none">
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
        <View style={styles.bannerEditHint} pointerEvents="none">
          <Ionicons name="image-outline" size={14} color="#fff" />
          <Text style={styles.bannerEditText}>Изменить баннер</Text>
        </View>
        <Pressable
          style={[styles.logoutBtn, { top: insets.top + 8 }]}
          onPress={onLogout}
          hitSlop={10}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
        </Pressable>
      </Pressable>

      <View style={styles.profileHead}>
        <Pressable style={styles.avatarWrap} onPress={onAvatarPress}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarFallbackText}>
                {user.username?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
          {uploadingAvatar ? (
            <View style={[styles.uploadOverlay, { borderRadius: 40 }]}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : (
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          )}
        </Pressable>
        <Text style={styles.username}>{user.username}</Text>
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.linksRow}>
        <ProfileLink
          icon="time-outline"
          label="История"
          onPress={() => stackNav.navigate("History")}
        />
        <ProfileLink
          icon="bar-chart-outline"
          label="Статистика"
          onPress={() => stackNav.navigate("Stats")}
        />
        <ProfileLink
          icon="people-outline"
          label="Друзья"
          onPress={() => stackNav.navigate("Friends")}
        />
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

    <Modal
      animationType="slide"
      transparent
      visible={pickerOpen !== null}
      onRequestClose={() => setPickerOpen(null)}
    >
      <Pressable
        style={styles.sheetBackdrop}
        onPress={() => setPickerOpen(null)}
      >
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          onPress={() => undefined}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{pickerTitle}</Text>
          {pickerHint ? (
            <Text style={styles.sheetHint}>{pickerHint}</Text>
          ) : null}
          <Pressable
            style={styles.sheetItem}
            onPress={() => {
              const k = pickerOpen;
              setPickerOpen(null);
              if (k) void pickAndUpload(k);
            }}
          >
            <View style={styles.sheetIconWrap}>
              <Ionicons
                name="cloud-upload-outline"
                size={22}
                color={colors.brand[400]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetItemTitle}>Загрузить новый</Text>
              <Text style={styles.sheetItemSub}>Выбрать из галереи</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.text.muted}
            />
          </Pressable>
          {pickerHasMedia ? (
            <Pressable
              style={[styles.sheetItem, styles.sheetItemDanger]}
              onPress={() => {
                const k = pickerOpen;
                setPickerOpen(null);
                if (k) void removeMedia(k);
              }}
            >
              <View
                style={[
                  styles.sheetIconWrap,
                  { backgroundColor: "rgba(239,68,68,0.15)" },
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color="#ef4444"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.sheetItemTitle, { color: "#ef4444" }]}
                >
                  Удалить
                </Text>
                <Text style={styles.sheetItemSub}>
                  Вернуть стандартное оформление
                </Text>
              </View>
            </Pressable>
          ) : null}
          <Pressable
            style={styles.sheetCancel}
            onPress={() => setPickerOpen(null)}
          >
            <Text style={styles.sheetCancelText}>Отмена</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}

function ProfileLink({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.linkCard} onPress={onPress}>
      <Ionicons name={icon} size={22} color={colors.brand[400]} />
      <Text style={styles.linkLabel}>{label}</Text>
    </Pressable>
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
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerEditHint: {
    position: "absolute",
    bottom: 8,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  bannerEditText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand[500],
    borderWidth: 2,
    borderColor: colors.bg.base,
  },
  linksRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: spacing.lg,
    marginTop: 16,
  },
  linkCard: {
    flex: 1,
    backgroundColor: colors.bg.panel,
    borderWidth: 1,
    borderColor: colors.bg.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    gap: 6,
  },
  linkLabel: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  serverHint: {
    marginTop: 24,
    color: colors.text.faint,
    fontSize: 11,
    paddingHorizontal: spacing.lg,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.bg.panel,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.bg.border,
    marginBottom: 12,
  },
  sheetTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  sheetHint: {
    color: colors.text.muted,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  sheetItem: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.bg.elevated,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  sheetItemDanger: {},
  sheetIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(241,93,80,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetItemTitle: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  sheetItemSub: {
    color: colors.text.muted,
    fontSize: 12,
    marginTop: 2,
  },
  sheetCancel: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
  },
  sheetCancelText: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: "700",
  },
});
