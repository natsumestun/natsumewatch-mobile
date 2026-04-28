import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Pill } from "./Pill";
import { colors, radius, spacing } from "../theme/colors";
import type { DubSource } from "../api/types";
import { dubLabel } from "../utils/format";

const COLLAPSED_LIMIT = 6;

export function DubSwitcher({
  sources,
  active,
  onSelect,
}: {
  sources: DubSource[];
  active: DubSource | null;
  onSelect: (s: DubSource) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!sources.length) return null;
  const needsCollapse = sources.length > COLLAPSED_LIMIT;
  const visible = expanded || !needsCollapse ? sources : sources.slice(0, COLLAPSED_LIMIT);
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Озвучки и источники</Text>
        <Text style={styles.count}>{sources.length}</Text>
      </View>
      <View style={styles.grid}>
        {visible.map((s, i) => {
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
      </View>
      {needsCollapse ? (
        <Pressable
          style={styles.toggle}
          onPress={() => setExpanded((v) => !v)}
          hitSlop={6}
        >
          <Text style={styles.toggleText}>
            {expanded ? "Скрыть" : `Показать все (${sources.length})`}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={colors.brand[400]}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    paddingHorizontal: spacing.lg,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  count: {
    color: colors.text.faint,
    fontSize: 13,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  toggle: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  toggleText: {
    color: colors.brand[400],
    fontSize: 12,
    fontWeight: "700",
  },
});
