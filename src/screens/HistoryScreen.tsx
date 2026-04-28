import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { apiFetch } from "../api/client";
import type { HistoryEntryOut } from "../api/types";
import { posterAbs } from "../api/posters";
import { colors, radius, spacing } from "../theme/colors";
import { formatRelative, formatTime } from "../utils/format";
import { getPositionsMap, positionKey } from "../utils/playbackPositions";
import type { RootStackParamList } from "../navigation/types";
import { useEffect, useState } from "react";

type PositionInfo = { position: number; duration: number };

type Props = NativeStackScreenProps<RootStackParamList, "History">;

export function HistoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery<HistoryEntryOut[]>({
    queryKey: ["history"],
    queryFn: () => apiFetch<HistoryEntryOut[]>("/me/history?limit=200"),
  });

  const removeOne = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/me/history/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["history"] }),
    onError: (e) => Alert.alert("Не удалось", String((e as Error).message)),
  });

  const clearAll = useMutation({
    mutationFn: () => apiFetch("/me/history", { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["history"] }),
    onError: (e) => Alert.alert("Не удалось", String((e as Error).message)),
  });

  const items = data ?? [];

  const [positions, setPositions] = useState<Record<string, PositionInfo>>({});
  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;
    void (async () => {
      const map = await getPositionsMap(
        items.map((i) => ({
          releaseId: i.release_id,
          episodeOrdinal: i.episode_ordinal,
          sourceProvider: i.source_provider,
          sourceStudio: i.source_studio,
        })),
      );
      if (cancelled) return;
      const out: Record<string, PositionInfo> = {};
      map.forEach((v, k) => {
        out[k] = { position: v.position, duration: v.duration };
      });
      setPositions(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [items]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>История просмотра</Text>
        {items.length ? (
          <Pressable
            onPress={() =>
              Alert.alert("Очистить историю?", "Это действие необратимо.", [
                { text: "Отмена", style: "cancel" },
                {
                  text: "Очистить",
                  style: "destructive",
                  onPress: () => clearAll.mutate(),
                },
              ])
            }
            hitSlop={8}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color={colors.text.muted}
            />
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.muted}>История пуста</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() =>
                navigation.navigate("Anime", {
                  idOrAlias: String(item.release_alias || item.release_id),
                  initialEpisode: item.episode_ordinal,
                  initialProvider: item.source_provider || undefined,
                  initialStudio: item.source_studio || undefined,
                })
              }
            >
              {item.release_poster ? (
                <Image
                  source={{ uri: posterAbs(item.release_poster) }}
                  style={styles.poster}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.poster, { backgroundColor: colors.bg.elevated }]} />
              )}
              <View style={styles.rowText}>
                <Text style={styles.releaseTitle} numberOfLines={2}>
                  {item.release_title || "Без названия"}
                </Text>
                <Text style={styles.episodeText}>
                  Эпизод {item.episode_ordinal}
                  {item.source_studio ? ` · ${item.source_studio}` : ""}
                </Text>
                {(() => {
                  const key = positionKey({
                    releaseId: item.release_id,
                    episodeOrdinal: item.episode_ordinal,
                    sourceProvider: item.source_provider,
                    sourceStudio: item.source_studio,
                  });
                  const pos = key ? positions[key] : null;
                  if (!pos || !pos.position) return null;
                  const finished = pos.duration && pos.position >= pos.duration - 15;
                  return (
                    <View style={styles.progressWrap}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: pos.duration
                                ? `${Math.min(100, (pos.position / pos.duration) * 100)}%`
                                : "0%",
                              backgroundColor: finished
                                ? colors.brand[400]
                                : colors.brand[500],
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {finished
                          ? "Просмотрено полностью"
                          : `Остановка на ${formatTime(pos.position)}${
                              pos.duration ? ` / ${formatTime(pos.duration)}` : ""
                            }`}
                      </Text>
                    </View>
                  );
                })()}
                <Text style={styles.dateText}>
                  {formatRelative(item.watched_at)}
                </Text>
              </View>
              <Pressable
                onPress={() => removeOne.mutate(item.id)}
                hitSlop={8}
                style={styles.deleteBtn}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={colors.text.faint}
                />
              </Pressable>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
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
  title: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingTop: 8 },
  empty: { paddingVertical: 60, alignItems: "center" },
  muted: { color: colors.text.muted },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    gap: 12,
  },
  poster: {
    width: 56,
    height: 84,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.elevated,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  progressWrap: {
    gap: 4,
    marginTop: 2,
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.bg.elevated,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    color: colors.text.muted,
    fontSize: 11,
  },
  releaseTitle: {
    color: colors.text.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  episodeText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  dateText: {
    color: colors.text.faint,
    fontSize: 11,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  sep: {
    height: 1,
    backgroundColor: colors.bg.border,
    marginHorizontal: spacing.lg,
  },
});
