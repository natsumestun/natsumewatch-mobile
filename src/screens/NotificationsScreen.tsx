import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { TouchableScale } from "../components/TouchableScale";
import { colors, radius, spacing } from "../theme/colors";
import {
  loadPrefs,
  savePrefs,
  requestNotificationPermissions,
  syncPushTokenWithBackend,
  type NotificationPrefs,
} from "../utils/notifications";
import {
  loadSubscriptions,
  unsubscribe,
  checkSubscriptionsForNewEpisodes,
  type AnimeSubscription,
} from "../utils/episodeSubscriptions";
import { posterAbs } from "../api/posters";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Notifications">;

export function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [subs, setSubs] = useState<AnimeSubscription[] | null>(null);

  useEffect(() => {
    void (async () => {
      const [p, s] = await Promise.all([loadPrefs(), loadSubscriptions()]);
      setPrefs(p);
      setSubs(s);
    })();
  }, []);

  const update = async (patch: Partial<NotificationPrefs>) => {
    if (!prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await savePrefs(next);
    if (patch.enabled === true) {
      const ok = await requestNotificationPermissions();
      if (ok) await syncPushTokenWithBackend();
    }
  };

  const removeSub = async (id: number) => {
    await unsubscribe(id);
    setSubs((prev) => (prev ?? []).filter((x) => x.id !== id));
  };

  if (!prefs || !subs) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg.base }]}>
        <ActivityIndicator color={colors.brand[500]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableScale
          onPress={() => navigation.goBack()}
          hitSlop={10}
          scaleTo={0.86}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableScale>
        <Text style={styles.title}>Уведомления</Text>
      </View>

      <FlatList
        data={subs}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <View>
            <View style={styles.card}>
              <Row
                icon="notifications-outline"
                label="Уведомления включены"
                value={prefs.enabled}
                onChange={(v) => update({ enabled: v })}
              />
              <Row
                icon="play-circle-outline"
                label="Новые серии"
                value={prefs.newEpisodes}
                onChange={(v) => update({ newEpisodes: v })}
                disabled={!prefs.enabled}
              />
              <Row
                icon="chatbubble-outline"
                label="Сообщения в чате"
                value={prefs.chatMessages}
                onChange={(v) => update({ chatMessages: v })}
                disabled={!prefs.enabled}
              />
              <Row
                icon="person-add-outline"
                label="Заявки в друзья"
                value={prefs.friendRequests}
                onChange={(v) => update({ friendRequests: v })}
                disabled={!prefs.enabled}
              />
            </View>

            <View style={styles.subsHeader}>
              <Text style={styles.sectionTitle}>Подписки на аниме</Text>
              <TouchableScale
                onPress={() => {
                  void checkSubscriptionsForNewEpisodes();
                }}
                hitSlop={6}
                scaleTo={0.9}
                style={styles.refreshBtn}
              >
                <Ionicons name="refresh" size={14} color={colors.text.primary} />
                <Text style={styles.refreshText}>Проверить</Text>
              </TouchableScale>
            </View>
            {subs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="notifications-off-outline"
                  size={28}
                  color={colors.text.muted}
                />
                <Text style={styles.emptyText}>
                  Вы ещё ни на что не подписаны
                </Text>
                <Text style={styles.emptyHint}>
                  Откройте страницу аниме и нажмите колокольчик, чтобы получать
                  уведомления о новых сериях.
                </Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.subRow}
            onPress={() =>
              navigation.navigate("Anime", {
                idOrAlias: item.alias ?? String(item.id),
              })
            }
          >
            {item.poster ? (
              <Image
                source={{ uri: posterAbs(item.poster) }}
                style={styles.poster}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.poster, { backgroundColor: colors.bg.elevated }]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.subTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.subHint}>Уведомлять о новых сериях</Text>
            </View>
            <TouchableScale
              onPress={() => removeSub(item.id)}
              hitSlop={8}
              scaleTo={0.85}
              style={styles.removeBtn}
            >
              <Ionicons
                name="close"
                size={18}
                color={colors.text.faint}
              />
            </TouchableScale>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onChange,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && { opacity: 0.5 }]}>
      <Ionicons name={icon} size={18} color={colors.text.primary} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: colors.brand[500], false: colors.bg.border }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    gap: 12,
  },
  title: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.bg.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.bg.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.border,
  },
  rowLabel: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  subsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    gap: 8,
  },
  sectionTitle: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.bg.panel,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  refreshText: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCard: {
    marginHorizontal: spacing.lg,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bg.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  emptyText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  emptyHint: {
    textAlign: "center",
    color: colors.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    gap: 12,
  },
  poster: {
    width: 48,
    height: 72,
    borderRadius: radius.sm,
  },
  subTitle: {
    color: colors.text.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  subHint: {
    color: colors.text.muted,
    fontSize: 11,
    marginTop: 4,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sep: {
    height: 1,
    backgroundColor: colors.bg.border,
    marginHorizontal: spacing.lg,
  },
});
