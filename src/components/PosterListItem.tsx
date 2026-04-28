import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../theme/colors";
import { posterUrl } from "../api/posters";
import type { ReleaseSummary } from "../api/types";

export function PosterListItem({
  release: r,
  index,
  onPress,
}: {
  release: ReleaseSummary;
  index?: number;
  onPress?: () => void;
}) {
  const url = posterUrl(r.poster, "preview") || posterUrl(r.poster, "src");
  const score = (r as unknown as { score?: number | null }).score;
  return (
    <Pressable onPress={onPress} style={styles.row}>
      {typeof index === "number" ? (
        <Text style={styles.index}>{index + 1}</Text>
      ) : null}
      <Image
        source={url ? { uri: url } : undefined}
        style={styles.poster}
        contentFit="cover"
        transition={180}
      />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {r.name.main}
        </Text>
        {r.name.english ? (
          <Text style={styles.english} numberOfLines={1}>
            {r.name.english}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{r.year}</Text>
          {r.type?.description ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.meta}>{r.type.description}</Text>
            </>
          ) : null}
          {typeof score === "number" && Number.isFinite(score) ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Ionicons name="star" size={11} color="#facc15" />
              <Text style={[styles.meta, { marginLeft: 2 }]}>
                {score.toFixed(1)}
              </Text>
            </>
          ) : null}
          {r.is_ongoing ? (
            <View style={styles.ongoing}>
              <Text style={styles.ongoingText}>Онгоинг</Text>
            </View>
          ) : null}
        </View>
        {r.description ? (
          <Text style={styles.desc} numberOfLines={3}>
            {r.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    alignItems: "flex-start",
    gap: 12,
  },
  index: {
    width: 18,
    textAlign: "center",
    color: colors.text.faint,
    fontSize: 13,
    fontWeight: "700",
    paddingTop: 4,
  },
  poster: {
    width: 72,
    height: 108,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.elevated,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  english: {
    color: colors.text.muted,
    fontSize: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
    marginTop: 2,
  },
  meta: {
    color: colors.text.muted,
    fontSize: 11,
  },
  dot: {
    color: colors.text.faint,
    fontSize: 11,
  },
  ongoing: {
    marginLeft: 4,
    backgroundColor: "rgba(244,63,94,0.15)",
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  ongoingText: {
    color: colors.brand[300],
    fontSize: 9,
    fontWeight: "700",
  },
  desc: {
    marginTop: 4,
    color: colors.text.secondary,
    fontSize: 12,
    lineHeight: 16,
  },
});
