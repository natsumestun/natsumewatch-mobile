import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Pill } from "./Pill";
import { colors, spacing } from "../theme/colors";
import type { DubSource } from "../api/types";
import { dubLabel } from "../utils/format";

export function DubSwitcher({
  sources,
  active,
  onSelect,
}: {
  sources: DubSource[];
  active: DubSource | null;
  onSelect: (s: DubSource) => void;
}) {
  if (!sources.length) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Озвучки и источники</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {sources.map((s, i) => {
          const isActive =
            active != null && s.provider === active.provider && s.studio === active.studio;
          return (
            <Pill
              key={`${s.provider}-${s.studio}-${i}`}
              label={dubLabel(s)}
              active={isActive}
              onPress={() => onSelect(s)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  title: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: spacing.lg,
  },
  row: {
    paddingHorizontal: spacing.lg,
    gap: 6,
  },
});
