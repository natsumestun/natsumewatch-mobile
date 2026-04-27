import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../theme/colors";

export function EpisodeGrid({
  ordinals,
  active,
  onSelect,
}: {
  ordinals: number[];
  active: number;
  onSelect: (n: number) => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Серии ({ordinals.length})</Text>
      <View style={styles.grid}>
        {ordinals.map((n) => {
          const isActive = n === active;
          return (
            <Pressable
              key={n}
              style={[styles.cell, isActive && styles.cellActive]}
              onPress={() => onSelect(n)}
            >
              <Text style={[styles.cellText, isActive && styles.cellTextActive]}>
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    paddingHorizontal: spacing.lg,
  },
  title: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cell: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.bg.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cellActive: {
    backgroundColor: colors.brand[500],
    borderColor: colors.brand[500],
  },
  cellText: {
    color: colors.text.secondary,
    fontWeight: "700",
    fontSize: 14,
  },
  cellTextActive: {
    color: "#fff",
  },
});
