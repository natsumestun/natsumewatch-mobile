import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
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
} from "../api/types";
import { colors, radius, spacing } from "../theme/colors";
import { PosterListItem } from "../components/PosterListItem";
import { TouchableScale } from "../components/TouchableScale";
import {
  CatalogFilterModal,
  DEFAULT_FILTER,
  filterActiveCount,
  type CatalogFilterValue,
} from "../components/CatalogFilterModal";
import type { RootStackParamList, TabParamList } from "../navigation/types";

type Props = BottomTabScreenProps<TabParamList, "Catalog">;

const PAGE_LIMIT = 24;

type Tab = {
  key: string;
  label: string;
  patch: (v: CatalogFilterValue) => CatalogFilterValue;
  matches: (v: CatalogFilterValue) => boolean;
};

const FRESH_SORT = "FRESH_AT_DESC";

const TABS: Tab[] = [
  {
    key: "all",
    label: "Все",
    patch: (v) => ({
      ...v,
      publishStatuses: [],
      types: [],
      sorting: FRESH_SORT,
    }),
    matches: (v) =>
      v.publishStatuses.length === 0 &&
      v.types.length === 0 &&
      v.sorting === FRESH_SORT,
  },
  {
    key: "ongoing",
    label: "Онгоинги",
    patch: (v) => ({
      ...v,
      publishStatuses: ["IS_ONGOING"],
      types: [],
      sorting: FRESH_SORT,
    }),
    matches: (v) =>
      v.publishStatuses.length === 1 &&
      v.publishStatuses[0] === "IS_ONGOING" &&
      v.types.length === 0 &&
      v.sorting === FRESH_SORT,
  },
  {
    key: "finished",
    label: "Завершённые",
    patch: (v) => ({
      ...v,
      publishStatuses: ["IS_NOT_ONGOING"],
      types: [],
      sorting: FRESH_SORT,
    }),
    matches: (v) =>
      v.publishStatuses.length === 1 &&
      v.publishStatuses[0] === "IS_NOT_ONGOING" &&
      v.types.length === 0 &&
      v.sorting === FRESH_SORT,
  },
  {
    key: "movies",
    label: "Фильмы",
    patch: (v) => ({
      ...v,
      publishStatuses: [],
      types: ["MOVIE"],
      sorting: FRESH_SORT,
    }),
    matches: (v) =>
      v.types.length === 1 &&
      v.types[0] === "MOVIE" &&
      v.publishStatuses.length === 0 &&
      v.sorting === FRESH_SORT,
  },
  {
    key: "ova",
    label: "OVA",
    patch: (v) => ({
      ...v,
      publishStatuses: [],
      types: ["OVA"],
      sorting: FRESH_SORT,
    }),
    matches: (v) =>
      v.types.length === 1 &&
      v.types[0] === "OVA" &&
      v.publishStatuses.length === 0 &&
      v.sorting === FRESH_SORT,
  },
  {
    key: "popular",
    label: "Популярное",
    patch: (v) => ({
      ...v,
      publishStatuses: [],
      types: [],
      sorting: "RATING_DESC",
    }),
    matches: (v) =>
      v.sorting === "RATING_DESC" &&
      v.publishStatuses.length === 0 &&
      v.types.length === 0,
  },
];

export function CatalogScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const stackNav =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<CatalogFilterValue>(() => {
    if (route.params?.ongoing) {
      return { ...DEFAULT_FILTER, publishStatuses: ["IS_ONGOING"] };
    }
    return DEFAULT_FILTER;
  });
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (route.params?.ongoing) {
      setFilter((v) => ({ ...v, publishStatuses: ["IS_ONGOING"] }));
    }
  }, [route.params?.ongoing]);

  const { data: refs } = useQuery<References>({
    queryKey: ["references"],
    queryFn: () => apiFetch<References>("/anime/references"),
    staleTime: 60 * 60 * 1000,
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_LIMIT));
    params.set("sorting", filter.sorting || "FRESH_AT_DESC");
    for (const g of filter.genres) params.append("genres", String(g));
    for (const t of filter.types) params.append("types", t);
    for (const s of filter.seasons) params.append("seasons", s);
    for (const a of filter.ageRatings) params.append("age_ratings", a);
    for (const p of filter.publishStatuses) params.append("publish_statuses", p);
    if (filter.fromYear) params.set("from_year", String(filter.fromYear));
    if (filter.toYear) params.set("to_year", String(filter.toYear));
    if (debouncedSearch) params.set("search", debouncedSearch);
    return params.toString();
  }, [filter, debouncedSearch]);

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

  const activeCount = filterActiveCount(filter);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={colors.text.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск аниме..."
            placeholderTextColor={colors.text.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch("")} hitSlop={6}>
              <Ionicons name="close-circle" size={18} color={colors.text.muted} />
            </Pressable>
          ) : null}
          <TouchableScale
            onPress={() => setFilterOpen(true)}
            style={styles.filterBtn}
            hitSlop={4}
            scaleTo={0.9}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={activeCount ? "#fff" : colors.text.primary}
            />
            {activeCount ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeCount}</Text>
              </View>
            ) : null}
          </TouchableScale>
        </View>

        <FlatList
          horizontal
          data={TABS}
          keyExtractor={(t) => t.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
          renderItem={({ item: t }) => {
            const active = t.matches(filter);
            return (
              <TouchableScale
                onPress={() => setFilter((v) => t.patch(v))}
                style={[styles.tab, active && styles.tabActive]}
                scaleTo={0.92}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {t.label}
                </Text>
              </TouchableScale>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ width: 6 }} />}
        />
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => `${item.id}-${i}`}
          contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item, index }) => (
            <PosterListItem
              release={item}
              index={index}
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

      <CatalogFilterModal
        visible={filterOpen}
        initial={filter}
        references={refs}
        onApply={setFilter}
        onClose={() => setFilterOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 8,
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
  filterBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.brand[500],
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  tabRow: {
    paddingVertical: 4,
    gap: 6,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.bg.border,
    backgroundColor: colors.bg.panel,
  },
  tabActive: {
    borderColor: colors.brand[500],
    backgroundColor: colors.brand[500],
  },
  tabText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#fff",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sep: {
    height: 1,
    backgroundColor: colors.bg.border,
    marginHorizontal: spacing.lg,
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
