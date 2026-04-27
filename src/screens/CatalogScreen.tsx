import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { apiFetch } from "../api/client";
import type {
  CatalogResponse,
  References,
  ReleaseSummary,
} from "../api/types";
import { colors, radius, spacing } from "../theme/colors";
import { PosterCard } from "../components/PosterCard";
import { Pill } from "../components/Pill";
import type { RootStackParamList, TabParamList } from "../navigation/types";

type Props = BottomTabScreenProps<TabParamList, "Catalog">;

const PAGE_LIMIT = 24;

export function CatalogScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const stackNav =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [genre, setGenre] = useState<number | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [ongoingOnly, setOngoingOnly] = useState<boolean>(
    Boolean(route.params?.ongoing),
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (route.params?.ongoing) setOngoingOnly(true);
  }, [route.params?.ongoing]);

  const { data: refs } = useQuery<References>({
    queryKey: ["references"],
    queryFn: () => apiFetch<References>("/anime/references"),
    staleTime: 60 * 60 * 1000,
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_LIMIT));
    params.set("sorting", "FRESH_AT_DESC");
    if (genre != null) params.set("genres", String(genre));
    if (type) params.set("types", type);
    if (ongoingOnly) params.set("publish_statuses", "IS_ONGOING");
    if (debouncedSearch) params.set("search", debouncedSearch);
    return params.toString();
  }, [genre, type, ongoingOnly, debouncedSearch]);

  const queryKey = ["catalog", queryString];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery<CatalogResponse>({
    queryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiFetch<CatalogResponse>(
        `/anime/catalog?${queryString}&page=${pageParam}`,
      ),
    getNextPageParam: (last) => {
      const p = last.meta?.pagination;
      if (!p) return undefined;
      return p.current_page < p.total_pages ? p.current_page + 1 : undefined;
    },
  });

  const items = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );

  const cardWidth = Math.floor((width - spacing.lg * 2 - 12 * 2) / 3);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={colors.text.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск..."
            placeholderTextColor={colors.text.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={colors.text.muted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filtersRow}>
          <FilterChips
            label="Все"
            active={!ongoingOnly && !type && genre == null}
            onPress={() => {
              setOngoingOnly(false);
              setType(null);
              setGenre(null);
            }}
          />
          <FilterChips
            label="Онгоинги"
            active={ongoingOnly}
            onPress={() => setOngoingOnly((v) => !v)}
          />
          {refs?.types?.slice(0, 4).map((t) => (
            <FilterChips
              key={t.value}
              label={t.description || t.value}
              active={type === t.value}
              onPress={() => setType((curr) => (curr === t.value ? null : t.value))}
            />
          ))}
        </View>

        {refs?.genres?.length ? (
          <FlatList
            horizontal
            data={refs.genres}
            keyExtractor={(g) => String(g.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genresRow}
            renderItem={({ item }) => (
              <Pill
                label={item.name}
                active={genre === item.id}
                onPress={() => setGenre((curr) => (curr === item.id ? null : item.id))}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
          />
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => `${item.id}-${i}`}
          numColumns={3}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 60 },
          ]}
          columnWrapperStyle={styles.column}
          renderItem={({ item }) => (
            <PosterCard
              release={item}
              width={cardWidth}
              onPress={() =>
                stackNav.navigate("Anime", {
                  idOrAlias: String(item.alias || item.id),
                })
              }
            />
          )}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.brand[500]} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Ничего не найдено</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function FilterChips({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return <Pill label={label} active={active} onPress={onPress} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: 10,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bg.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 15,
  },
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  genresRow: {
    paddingVertical: 4,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: 12,
  },
  column: {
    gap: 12,
  },
  footer: {
    paddingVertical: 16,
  },
  empty: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    color: colors.text.muted,
  },
});
