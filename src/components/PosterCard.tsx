import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../theme/colors";
import { posterUrl } from "../api/posters";
import type { ReleaseSummary } from "../api/types";

export type PosterCardProps = {
  release: ReleaseSummary;
  onPress?: () => void;
  width?: number;
};

export function PosterCard({ release: r, onPress, width = 140 }: PosterCardProps) {
  const height = Math.round((width * 3) / 2);
  const url = posterUrl(r.poster, "preview") || posterUrl(r.poster, "src");
  return (
    <Pressable onPress={onPress} style={[styles.wrap, { width, height }]}>
      <Image
        source={url ? { uri: url } : undefined}
        style={styles.img}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.overlay} pointerEvents="none" />
      <View style={styles.text} pointerEvents="none">
        <Text numberOfLines={2} style={styles.title}>
          {r.name.main}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{r.year}</Text>
          {r.type?.description ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.metaText} numberOfLines={1}>
                {r.type.description}
              </Text>
            </>
          ) : null}
          {r.is_ongoing ? (
            <View style={styles.ongoing}>
              <Text style={styles.ongoingText}>Онгоинг</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  img: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "60%",
    backgroundColor: "rgba(10,6,19,0.65)",
  },
  text: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
  },
  title: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 16,
  },
  metaRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: colors.text.muted,
    fontSize: 11,
  },
  dot: {
    color: colors.text.faint,
    fontSize: 11,
  },
  ongoing: {
    marginLeft: "auto",
    backgroundColor: "rgba(244,63,94,0.2)",
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ongoingText: {
    color: colors.brand[300],
    fontSize: 9,
    fontWeight: "600",
  },
});
