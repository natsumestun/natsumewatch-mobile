import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../api/client";
import type { ReleaseSummary } from "../api/types";
import { posterUrl } from "../api/posters";
import { colors, radius, spacing } from "../theme/colors";

export function Hero({
  onSelect,
}: {
  onSelect: (r: ReleaseSummary) => void;
}) {
  const { data } = useQuery<ReleaseSummary[]>({
    queryKey: ["featured"],
    queryFn: () => apiFetch<ReleaseSummary[]>("/anime/featured"),
    staleTime: 10 * 60 * 1000,
  });
  const { width } = useWindowDimensions();
  const list = data ?? [];
  const [idx, setIdx] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setIdx((i) => (i + 1) % list.length);
        Animated.timing(fade, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    }, 6500);
    return () => clearInterval(t);
  }, [list.length, fade]);

  const heroHeight = Math.min(Math.round(width * 0.85), 460);

  if (list.length === 0) {
    return <View style={[styles.skeleton, { height: heroHeight }]} />;
  }

  const r = list[idx];
  const url = posterUrl(r.poster, "src");

  return (
    <View style={[styles.wrap, { height: heroHeight }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <Image source={url ? { uri: url } : undefined} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Animated.View>
      <View style={styles.fadeTop} pointerEvents="none" />
      <View style={styles.fadeBottom} pointerEvents="none" />
      <View style={styles.content}>
        <View style={styles.tags}>
          <View style={styles.ongoingTag}>
            <Text style={styles.ongoingText}>{r.is_ongoing ? "Онгоинг" : "Завершено"}</Text>
          </View>
          <Text style={styles.tagText}>{r.year}</Text>
          {r.type?.description ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.tagText}>{r.type.description}</Text>
            </>
          ) : null}
          {r.age_rating?.label ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.tagText}>{r.age_rating.label}</Text>
            </>
          ) : null}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {r.name.main}
        </Text>
        {r.name.english ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {r.name.english}
          </Text>
        ) : null}
        {r.description ? (
          <Text style={styles.description} numberOfLines={3}>
            {r.description}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Pressable style={styles.btnPrimary} onPress={() => onSelect(r)}>
            <Ionicons name="play" size={16} color="#fff" />
            <Text style={styles.btnPrimaryText}>Смотреть</Text>
          </Pressable>
          <Pressable style={styles.btnGhost} onPress={() => onSelect(r)}>
            <Text style={styles.btnGhostText}>Подробнее</Text>
          </Pressable>
        </View>
      </View>
      {list.length > 1 ? (
        <View style={styles.dots}>
          {list.map((_, i) => (
            <View
              key={i}
              style={[styles.dotIndicator, i === idx && styles.dotIndicatorActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    borderRadius: 0,
    backgroundColor: colors.bg.panel,
    position: "relative",
  },
  skeleton: {
    backgroundColor: colors.bg.panel,
  },
  fadeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "30%",
    backgroundColor: "rgba(10,6,19,0.4)",
  },
  fadeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "70%",
    backgroundColor: "rgba(10,6,19,0.7)",
  },
  content: {
    position: "absolute",
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    gap: 8,
  },
  tags: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  ongoingTag: {
    backgroundColor: "rgba(244,63,94,0.2)",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ongoingText: {
    color: colors.brand[300],
    fontSize: 11,
    fontWeight: "600",
  },
  tagText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  dot: {
    color: colors.text.faint,
    fontSize: 12,
  },
  title: {
    color: colors.text.primary,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 30,
  },
  subtitle: {
    color: colors.text.muted,
    fontSize: 13,
  },
  description: {
    color: colors.text.secondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  btnPrimary: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: colors.brand[500],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  btnGhost: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  btnGhostText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  dots: {
    position: "absolute",
    right: 12,
    top: 12,
    flexDirection: "row",
    gap: 4,
  },
  dotIndicator: {
    width: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotIndicatorActive: {
    width: 24,
    backgroundColor: colors.brand[500],
  },
});
