import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { apiFetch } from "../api/client";
import type {
  AnimeMeta,
  DubAnilibriaEpisode,
  DubKodikEpisode,
  DubSource,
  DubsResponse,
  RatingsResponse,
  Release,
} from "../api/types";
import { posterUrl } from "../api/posters";
import { colors, radius, spacing } from "../theme/colors";
import { DubSwitcher } from "../components/DubSwitcher";
import { EpisodeGrid } from "../components/EpisodeGrid";
import { RatingsBar } from "../components/RatingsBar";
import { ListPicker } from "../components/ListPicker";
import { useAuth } from "../store/auth";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Anime">;

function pickDefault(sources: DubSource[]): DubSource | null {
  if (!sources.length) return null;
  return sources.find((s) => s.provider === "anilibria") ?? sources[0];
}

function clampOrdinal(source: DubSource | null, n: number): number {
  if (!source) return n;
  const ordinals = source.episodes.map((e) => e.ordinal);
  if (!ordinals.length) return 1;
  if (ordinals.includes(n)) return n;
  return ordinals[0];
}

function pickHls(ep: DubAnilibriaEpisode): string | null {
  return ep.hls_1080 || ep.hls_720 || ep.hls_480;
}

export function AnimeScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { idOrAlias, initialEpisode, initialProvider, initialStudio } = route.params;
  const { user } = useAuth();

  const releaseQ = useQuery<Release>({
    queryKey: ["release", idOrAlias],
    queryFn: () => apiFetch<Release>(`/anime/${idOrAlias}`),
  });
  const dubsQ = useQuery<DubsResponse>({
    queryKey: ["dubs", idOrAlias],
    queryFn: () => apiFetch<DubsResponse>(`/anime/${idOrAlias}/dubs`),
  });
  const metaQ = useQuery<AnimeMeta>({
    queryKey: ["meta", idOrAlias],
    queryFn: () => apiFetch<AnimeMeta>(`/anime/${idOrAlias}/meta`),
  });
  const ratingsQ = useQuery<RatingsResponse>({
    queryKey: ["ratings", idOrAlias],
    queryFn: () => apiFetch<RatingsResponse>(`/anime/${idOrAlias}/ratings`),
  });

  const sources = dubsQ.data?.sources ?? [];
  const [activeSource, setActiveSource] = useState<DubSource | null>(null);
  const [activeEp, setActiveEp] = useState(1);

  useEffect(() => {
    setActiveSource(null);
    setActiveEp(1);
  }, [idOrAlias]);

  useEffect(() => {
    if (!sources.length) return;
    const stillValid =
      activeSource &&
      sources.some(
        (s) =>
          s.provider === activeSource.provider && s.studio === activeSource.studio,
      );
    if (!stillValid) {
      const initial =
        (initialProvider &&
          sources.find(
            (s) =>
              s.provider === initialProvider &&
              (!initialStudio || s.studio === initialStudio),
          )) ||
        pickDefault(sources);
      setActiveSource(initial);
    }
  }, [sources, activeSource, initialProvider, initialStudio]);

  useEffect(() => {
    if (!activeSource) return;
    setActiveEp((n) => clampOrdinal(activeSource, initialEpisode ?? n));
  }, [activeSource, initialEpisode]);

  const ordinals = useMemo(
    () => activeSource?.episodes.map((e) => e.ordinal) ?? [],
    [activeSource],
  );

  const release = releaseQ.data;
  const meta = metaQ.data;

  if (releaseQ.isLoading || !release) {
    return (
      <View style={styles.fullCenter}>
        <ActivityIndicator color={colors.brand[500]} />
      </View>
    );
  }

  if (releaseQ.error) {
    return (
      <View style={styles.fullCenter}>
        <Text style={styles.errorText}>Не удалось загрузить тайтл</Text>
      </View>
    );
  }

  const heroUrl = posterUrl(release.poster, "src");
  const heroHeight = Math.round(width * 1.0);

  const handlePlay = () => {
    if (!activeSource || !ordinals.length) return;
    const ep = activeSource.episodes.find((e) => e.ordinal === activeEp);
    if (!ep) return;
    const releaseId = typeof release.id === "number" ? release.id : Number(release.id);
    if (activeSource.provider === "anilibria") {
      const aniEp = ep as DubAnilibriaEpisode;
      const url = pickHls(aniEp);
      if (!url) return;
      navigation.navigate("Player", {
        title: `${release.name.main} · Эпизод ${ep.ordinal}`,
        hls: url,
        releaseId,
        episodeOrdinal: ep.ordinal,
        episodeName: aniEp.name,
        sourceProvider: activeSource.provider,
        sourceStudio: activeSource.studio,
      });
    } else {
      const k = ep as DubKodikEpisode;
      const iframe = k.iframe.startsWith("http")
        ? k.iframe
        : `https:${k.iframe}`;
      navigation.navigate("KodikPlayer", {
        title: `${release.name.main} · Эпизод ${ep.ordinal}`,
        iframeUrl: iframe,
        releaseId,
        episodeOrdinal: ep.ordinal,
        episodeName: null,
        sourceProvider: activeSource.provider,
        sourceStudio: activeSource.studio,
      });
    }
  };

  const watchDisabled = !activeSource || !ordinals.length;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroWrap, { height: heroHeight }]}>
        {heroUrl ? (
          <Image source={{ uri: heroUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : null}
        <View style={styles.heroFade} pointerEvents="none" />
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { top: insets.top + 8 }]}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.heroBottom}>
          <View style={styles.tags}>
            <View
              style={[
                styles.tagPill,
                release.is_ongoing
                  ? { backgroundColor: "rgba(244,63,94,0.25)" }
                  : { backgroundColor: "rgba(255,255,255,0.1)" },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  release.is_ongoing && { color: colors.brand[300] },
                ]}
              >
                {release.is_ongoing ? "Онгоинг" : "Завершено"}
              </Text>
            </View>
            <Text style={styles.metaText}>{release.year}</Text>
            {release.type?.description ? (
              <>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.metaText}>{release.type.description}</Text>
              </>
            ) : null}
            {release.age_rating?.label ? (
              <>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.metaText}>{release.age_rating.label}</Text>
              </>
            ) : null}
          </View>
          <Text style={styles.title} numberOfLines={3}>
            {release.name.main}
          </Text>
          {release.name.english ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {release.name.english}
            </Text>
          ) : null}
          {meta?.title_japanese ? (
            <Text style={styles.subtitleJp} numberOfLines={2}>
              {meta.title_japanese}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          style={[styles.btnPrimary, watchDisabled && styles.btnDisabled]}
          onPress={handlePlay}
          disabled={watchDisabled}
        >
          <Ionicons name="play" size={16} color="#fff" />
          <Text style={styles.btnPrimaryText}>
            {dubsQ.isLoading
              ? "Загрузка..."
              : watchDisabled
              ? "Источников нет"
              : `Эпизод ${activeEp}`}
          </Text>
        </Pressable>
        <ListPicker releaseId={release.id} />
        {!user ? (
          <Text style={styles.hint}>Войдите, чтобы добавлять в списки</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <RatingsBar ratings={ratingsQ.data?.ratings} />
      </View>

      {meta ? (
        <View style={[styles.section, styles.metaCard]}>
          {meta.studios?.length ? (
            <Row label="Студия" value={meta.studios.join(", ")} />
          ) : null}
          {meta.director ? <Row label="Режиссёр" value={meta.director} /> : null}
          {meta.source_label ? (
            <Row label="Первоисточник" value={meta.source_label} />
          ) : null}
          {release.type?.description ? (
            <Row label="Тип" value={release.type.description} />
          ) : null}
          {release.season?.description ? (
            <Row
              label="Сезон"
              value={`${release.season.description} ${release.year}`}
            />
          ) : null}
          {release.episodes_total ? (
            <Row label="Эпизодов" value={String(release.episodes_total)} />
          ) : null}
          {release.average_duration_of_episode ? (
            <Row
              label="Длительность"
              value={`~${Math.round(
                release.average_duration_of_episode / 60,
              )} мин`}
            />
          ) : null}
        </View>
      ) : null}

      {release.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Описание</Text>
          <Text style={styles.description}>{release.description}</Text>
        </View>
      ) : null}

      {release.genres?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Жанры</Text>
          <View style={styles.genres}>
            {release.genres.map((g) => (
              <View key={g.id} style={styles.genreChip}>
                <Text style={styles.genreText}>{g.name}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.tilesRow}>
          <NavTile
            icon="chatbubbles-outline"
            label="Комментарии"
            onPress={() =>
              navigation.navigate("Comments", {
                releaseId: Number(release.id),
                title: release.name.main,
              })
            }
          />
          <NavTile
            icon="star-outline"
            label="Рецензии"
            onPress={() =>
              navigation.navigate("Reviews", {
                releaseId: Number(release.id),
                title: release.name.main,
              })
            }
          />
          <NavTile
            icon="cloud-download-outline"
            label="Торренты"
            onPress={() =>
              navigation.navigate("Torrents", {
                idOrAlias: String(release.alias || release.id),
                title: release.name.main,
              })
            }
          />
        </View>
      </View>

      {dubsQ.isLoading ? (
        <View style={[styles.section, { alignItems: "center" }]}>
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      ) : sources.length ? (
        <View style={styles.sectionGap}>
          <DubSwitcher
            sources={sources}
            active={activeSource}
            onSelect={setActiveSource}
          />
          {ordinals.length ? (
            <EpisodeGrid
              ordinals={ordinals}
              active={activeEp}
              onSelect={setActiveEp}
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.muted}>Источники для этого тайтла не найдены</Text>
        </View>
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function NavTile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      <Ionicons name={icon} size={22} color={colors.brand[400]} />
      <Text style={styles.tileText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  fullCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg.base,
  },
  errorText: {
    color: colors.text.muted,
    fontSize: 15,
  },
  heroWrap: {
    position: "relative",
    backgroundColor: colors.bg.panel,
  },
  heroFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "75%",
    backgroundColor: "rgba(10,6,19,0.78)",
  },
  backBtn: {
    position: "absolute",
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBottom: {
    position: "absolute",
    bottom: 16,
    left: spacing.lg,
    right: spacing.lg,
    gap: 6,
  },
  tags: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text.primary,
  },
  metaText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  dot: {
    color: colors.text.faint,
    fontSize: 12,
  },
  title: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 28,
  },
  subtitle: {
    color: colors.text.muted,
    fontSize: 13,
  },
  subtitleJp: {
    color: colors.text.faint,
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    flexWrap: "wrap",
  },
  btnPrimary: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: colors.brand[500],
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  hint: {
    color: colors.text.muted,
    fontSize: 11,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: 8,
  },
  sectionGap: {
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  description: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  metaCard: {
    backgroundColor: colors.bg.panel,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.border,
  },
  rowLabel: {
    width: 110,
    color: colors.text.muted,
    fontSize: 13,
  },
  rowValue: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  genres: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  genreChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  genreText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  muted: {
    color: colors.text.muted,
    fontSize: 13,
  },
  tilesRow: {
    flexDirection: "row",
    gap: 10,
  },
  tile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    backgroundColor: colors.bg.panel,
    borderWidth: 1,
    borderColor: colors.bg.border,
    borderRadius: radius.md,
  },
  tileText: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: "600",
  },
});
