import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "react-native";
import { colors, radius } from "../theme/colors";
import type { ExternalRating } from "../api/types";

const SOURCE_LABELS: Record<string, string> = {
  anilibria: "AniLibria",
  shikimori: "Shikimori",
  imdb: "IMDb",
  mal: "MAL",
  myanimelist: "MAL",
  kinopoisk: "Кинопоиск",
};

export function RatingsBar({ ratings }: { ratings: ExternalRating[] | undefined }) {
  if (!ratings?.length) return null;
  const items = ratings.filter((r) => r.kind !== "label");
  if (!items.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map((r, i) => {
        const label = SOURCE_LABELS[r.source.toLowerCase()] || r.source;
        const value = r.value === null ? "—" : String(r.value);
        const Wrapper = r.url ? Pressable : View;
        return (
          <Wrapper
            key={i}
            onPress={r.url ? () => Linking.openURL(r.url!) : undefined}
            style={styles.cell}
          >
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.label}>{label}</Text>
          </Wrapper>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 4,
  },
  cell: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 64,
  },
  value: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  label: {
    color: colors.text.muted,
    fontSize: 10,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
});
