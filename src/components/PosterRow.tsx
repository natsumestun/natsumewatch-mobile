import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { apiFetch } from "../api/client";
import type { CatalogResponse, ReleaseSummary } from "../api/types";
import { colors, spacing } from "../theme/colors";
import { PosterCard } from "./PosterCard";

type RowResponse = CatalogResponse | ReleaseSummary[];

function normalize(data: RowResponse | undefined): ReleaseSummary[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.data ?? [];
}

export type PosterRowProps = {
  title: string;
  endpoint: string;
  onSelect: (release: ReleaseSummary) => void;
};

export function PosterRow({ title, endpoint, onSelect }: PosterRowProps) {
  const { data, isLoading } = useQuery<RowResponse>({
    queryKey: ["row", endpoint],
    queryFn: () => apiFetch<RowResponse>(endpoint),
    staleTime: 5 * 60 * 1000,
  });
  const list = normalize(data);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {isLoading && list.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      ) : (
        <FlatList
          horizontal
          data={list}
          keyExtractor={(r) => String(r.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          renderItem={({ item }) => (
            <PosterCard release={item} onPress={() => onSelect(item)} />
          )}
          ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  title: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: spacing.lg,
  },
  row: {
    paddingHorizontal: spacing.lg,
  },
  loading: {
    height: 210,
    alignItems: "center",
    justifyContent: "center",
  },
});
