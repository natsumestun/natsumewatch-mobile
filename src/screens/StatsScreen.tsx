import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { G, Path, Text as SvgText, Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { apiFetch } from "../api/client";
import type { ProfileStats, StatsBucket } from "../api/types";
import { colors, radius, spacing } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Stats">;

const PIE_COLORS = [
  "#f43f5e",
  "#fb7185",
  "#fda4af",
  "#a78bfa",
  "#7c3aed",
  "#3b82f6",
  "#22d3ee",
  "#10b981",
  "#facc15",
  "#fb923c",
];

export function StatsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery<ProfileStats>({
    queryKey: ["my-stats"],
    queryFn: () => apiFetch<ProfileStats>("/me/stats"),
  });

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>Статистика</Text>
      </View>

      {isLoading || !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      ) : (
        <View style={{ gap: 20 }}>
          <Totals stats={data} />
          <Section title="По жанрам">
            <BarList items={data.by_genre} />
          </Section>
          <Section title="По типу">
            <PieChart items={data.by_type} />
          </Section>
          <Section title="По годам">
            <BarList items={data.by_year.slice().reverse()} />
          </Section>
        </View>
      )}
    </ScrollView>
  );
}

function Totals({ stats }: { stats: ProfileStats }) {
  const cells: Array<[string, number]> = [
    ["Просмотрено", stats.total_watched],
    ["Смотрю", stats.total_watching],
    ["Запланировано", stats.total_planned],
    ["Отложено", stats.total_postponed],
    ["Брошено", stats.total_dropped],
    ["Избранное", stats.total_favorite],
  ];
  return (
    <View style={styles.totalsGrid}>
      {cells.map(([label, n]) => (
        <View key={label} style={styles.totalsCell}>
          <Text style={styles.totalsLabel}>{label}</Text>
          <Text style={styles.totalsValue}>{n}</Text>
        </View>
      ))}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function BarList({ items }: { items: StatsBucket[] }) {
  if (!items.length) {
    return <Text style={styles.muted}>Данных пока нет</Text>;
  }
  const max = Math.max(...items.map((i) => i.count), 1);
  const top = items.slice(0, 12);
  return (
    <View style={{ gap: 8 }}>
      {top.map((b) => (
        <View key={b.label} style={styles.barRow}>
          <Text style={styles.barLabel} numberOfLines={1}>
            {b.label}
          </Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${(b.count / max) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.barValue}>{b.count}</Text>
        </View>
      ))}
    </View>
  );
}

function PieChart({ items }: { items: StatsBucket[] }) {
  const { width } = useWindowDimensions();
  const size = Math.min(width - spacing.lg * 2, 280);
  const r = size / 2;
  const center = size / 2;
  const total = items.reduce((acc, i) => acc + i.count, 0);

  if (!items.length || total === 0) {
    return <Text style={styles.muted}>Данных пока нет</Text>;
  }

  let angle = -Math.PI / 2;
  const slices = items.map((b, i) => {
    const sliceAngle = (b.count / total) * Math.PI * 2;
    const x1 = center + Math.cos(angle) * r;
    const y1 = center + Math.sin(angle) * r;
    const x2 = center + Math.cos(angle + sliceAngle) * r;
    const y2 = center + Math.sin(angle + sliceAngle) * r;
    const large = sliceAngle > Math.PI ? 1 : 0;
    const d = `M${center},${center} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
    const color = PIE_COLORS[i % PIE_COLORS.length];
    angle += sliceAngle;
    return { d, color, label: b.label, count: b.count };
  });

  return (
    <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
      <Svg width={size} height={size}>
        <G>
          {slices.map((s, i) => (
            <Path key={i} d={s.d} fill={s.color} />
          ))}
          <Circle cx={center} cy={center} r={r * 0.45} fill={colors.bg.base} />
          <SvgText
            x={center}
            y={center + 4}
            fill={colors.text.primary}
            fontSize="22"
            fontWeight="700"
            textAnchor="middle"
          >
            {total}
          </SvgText>
        </G>
      </Svg>
      <View style={{ flex: 1, gap: 6 }}>
        {slices.map((s, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {s.label}
            </Text>
            <Text style={styles.legendCount}>{s.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    gap: 12,
  },
  title: { color: colors.text.primary, fontSize: 18, fontWeight: "800" },
  center: { paddingVertical: 60, alignItems: "center" },
  muted: { color: colors.text.muted, fontSize: 13 },
  totalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.lg,
    gap: 10,
  },
  totalsCell: {
    flexBasis: "31%",
    flexGrow: 1,
    backgroundColor: colors.bg.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  totalsLabel: { color: colors.text.muted, fontSize: 11 },
  totalsValue: { color: colors.text.primary, fontWeight: "800", fontSize: 22 },
  section: { paddingHorizontal: spacing.lg, gap: 10 },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { width: 100, color: colors.text.secondary, fontSize: 12 },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: colors.bg.elevated,
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: colors.brand[500],
    borderRadius: 999,
  },
  barValue: { width: 36, textAlign: "right", color: colors.text.primary, fontSize: 12, fontWeight: "700" },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, color: colors.text.primary, fontSize: 12 },
  legendCount: { color: colors.text.muted, fontSize: 12, fontWeight: "700" },
});
