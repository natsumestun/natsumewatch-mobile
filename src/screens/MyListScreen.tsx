import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { apiFetch } from "../api/client";
import { STATUS_LABELS, type ListItem } from "../api/types";
import { colors, radius, spacing } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "MyList">;

export function MyListScreen({ route, navigation }: Props) {
  const { status } = route.params;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { data, isLoading, refetch, isRefetching } = useQuery<ListItem[]>({
    queryKey: ["my-list-status", status],
    queryFn: () => apiFetch<ListItem[]>(`/me/lists?status=${status}`),
  });

  const items = useMemo(() => data ?? [], [data]);
  const cardWidth = Math.floor((width - spacing.lg * 2 - 12 * 2) / 3);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>{STATUS_LABELS[status]}</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          numColumns={3}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          columnWrapperStyle={{ gap: 12 }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.muted}>В этом списке пока пусто</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.cell, { width: cardWidth, height: Math.round((cardWidth * 3) / 2) }]}
              onPress={() =>
                navigation.navigate("Anime", {
                  idOrAlias: String(item.release_alias || item.release_id),
                })
              }
            >
              {item.release_poster ? (
                <Image
                  source={{ uri: posterAbs(item.release_poster) }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
              ) : null}
              <View style={styles.cellOverlay} pointerEvents="none" />
              <View style={styles.cellText} pointerEvents="none">
                <Text numberOfLines={2} style={styles.cellTitle}>
                  {item.release_title || "Без названия"}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function posterAbs(p: string): string {
  if (/^https?:\/\//.test(p)) return p;
  return `https://anilibria.top${p}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  title: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: 12,
  },
  empty: {
    paddingVertical: 60,
    alignItems: "center",
  },
  muted: {
    color: colors.text.muted,
  },
  cell: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  cellOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
    backgroundColor: "rgba(10,6,19,0.65)",
  },
  cellText: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
  },
  cellTitle: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 16,
  },
});
