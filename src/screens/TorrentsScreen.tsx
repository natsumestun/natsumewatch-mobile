import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { apiFetch } from "../api/client";
import type { Torrent, TorrentsResponse } from "../api/types";
import { colors, radius, spacing } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Torrents">;

function formatBytes(n: number | null): string {
  if (!n) return "—";
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} ГБ`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(0)} МБ`;
  return `${(n / 1024).toFixed(0)} КБ`;
}

export function TorrentsScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { idOrAlias, title } = route.params;

  const { data, isLoading } = useQuery<TorrentsResponse>({
    queryKey: ["torrents", idOrAlias],
    queryFn: () => apiFetch<TorrentsResponse>(`/anime/${idOrAlias}/torrents`),
  });

  async function openMagnet(magnet: string) {
    try {
      const can = await Linking.canOpenURL(magnet);
      if (can) {
        await Linking.openURL(magnet);
        return;
      }
    } catch {
      /* fall through */
    }
    Alert.alert(
      "Нет торрент-клиента",
      "Установите qBittorrent / Flud / LibreTorrent или скопируйте magnet.",
      [
        { text: "Скопировать", onPress: () => copyMagnet(magnet) },
        { text: "Закрыть", style: "cancel" },
      ],
    );
  }

  async function copyMagnet(magnet: string) {
    try {
      await Clipboard.setStringAsync(magnet);
      Alert.alert("Скопировано", "Magnet-ссылка в буфере обмена.");
    } catch {
      Alert.alert("Не удалось скопировать");
    }
  }

  const torrents = data?.torrents ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Торренты</Text>
          {title ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      ) : (
        <FlatList
          data={torrents}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 24, gap: 10 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.muted}>Торренты для этого тайтла недоступны.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TorrentCard
              t={item}
              onMagnet={openMagnet}
              onCopy={copyMagnet}
              onTorrent={(url) => Linking.openURL(url)}
            />
          )}
        />
      )}
    </View>
  );
}

function TorrentCard({
  t,
  onMagnet,
  onCopy,
  onTorrent,
}: {
  t: Torrent;
  onMagnet: (m: string) => void;
  onCopy: (m: string) => void;
  onTorrent: (url: string) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.tagRow}>
        <View style={styles.qualityTag}>
          <Text style={styles.qualityText}>{t.quality ?? "?"}</Text>
        </View>
        {t.type ? <Tag label={t.type} /> : null}
        {t.codec ? <Text style={styles.muted}>{t.codec}</Text> : null}
        {t.is_hardsub ? <Tag label="хардсаб" warn /> : null}
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {t.label || t.filename || `Torrent #${t.id}`}
      </Text>
      <View style={styles.metaRow}>
        {t.episodes ? <Text style={styles.meta}>серии {t.episodes}</Text> : null}
        <Text style={styles.meta}>{formatBytes(t.size)}</Text>
        <Text style={[styles.meta, { color: "#34d399" }]}>{t.seeders ?? 0} ↑</Text>
        <Text style={[styles.meta, { color: "#fb7185" }]}>{t.leechers ?? 0} ↓</Text>
        {typeof t.completed_times === "number" ? (
          <Text style={styles.meta}>скачано {t.completed_times}×</Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        {t.magnet ? (
          <>
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => onMagnet(t.magnet as string)}
            >
              <Ionicons name="magnet-outline" size={14} color="#fff" />
              <Text style={styles.btnPrimaryText}>Magnet</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={() => onCopy(t.magnet as string)}>
              <Ionicons name="copy-outline" size={14} color={colors.text.primary} />
              <Text style={styles.btnText}>Скопировать</Text>
            </Pressable>
          </>
        ) : null}
        {t.download_url ? (
          <Pressable style={styles.btn} onPress={() => onTorrent(t.download_url as string)}>
            <Ionicons name="download-outline" size={14} color={colors.text.primary} />
            <Text style={styles.btnText}>.torrent</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Tag({ label, warn }: { label: string; warn?: boolean }) {
  return (
    <View
      style={[
        styles.chip,
        warn && { borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.15)" },
      ]}
    >
      <Text style={[styles.chipText, warn && { color: "#fcd34d" }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    gap: 12,
  },
  title: { color: colors.text.primary, fontSize: 18, fontWeight: "800" },
  subtitle: { color: colors.text.muted, fontSize: 12, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { paddingVertical: 60, alignItems: "center" },
  muted: { color: colors.text.muted, fontSize: 12 },
  card: {
    backgroundColor: colors.bg.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
    padding: 14,
    gap: 8,
  },
  tagRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  qualityTag: {
    backgroundColor: "rgba(244,63,94,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qualityText: { color: colors.brand[300], fontSize: 11, fontWeight: "700" },
  chip: {
    borderWidth: 1,
    borderColor: colors.bg.border,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  chipText: { color: colors.text.secondary, fontSize: 11 },
  label: { color: colors.text.primary, fontSize: 14, fontWeight: "600" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  meta: { color: colors.text.muted, fontSize: 11 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.bg.border,
    backgroundColor: colors.bg.elevated,
  },
  btnText: { color: colors.text.primary, fontSize: 12, fontWeight: "600" },
  btnPrimary: {
    backgroundColor: colors.brand[500],
    borderColor: colors.brand[500],
  },
  btnPrimaryText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
