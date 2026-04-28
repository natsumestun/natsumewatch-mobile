import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../theme/colors";
import type { References } from "../api/types";

export type CatalogFilterValue = {
  genres: number[];
  types: string[];
  seasons: string[];
  ageRatings: string[];
  fromYear: number | null;
  toYear: number | null;
  publishStatuses: string[];
  sorting: string;
};

export const DEFAULT_FILTER: CatalogFilterValue = {
  genres: [],
  types: [],
  seasons: [],
  ageRatings: [],
  fromYear: null,
  toYear: null,
  publishStatuses: [],
  sorting: "FRESH_AT_DESC",
};

function countActive(v: CatalogFilterValue): number {
  let n = 0;
  if (v.genres.length) n++;
  if (v.types.length) n++;
  if (v.seasons.length) n++;
  if (v.ageRatings.length) n++;
  if (v.publishStatuses.length) n++;
  if (v.fromYear || v.toYear) n++;
  if (v.sorting && v.sorting !== "FRESH_AT_DESC") n++;
  return n;
}

export function filterActiveCount(v: CatalogFilterValue): number {
  return countActive(v);
}

export function CatalogFilterModal({
  visible,
  initial,
  references,
  onApply,
  onClose,
}: {
  visible: boolean;
  initial: CatalogFilterValue;
  references: References | undefined;
  onApply: (v: CatalogFilterValue) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState<CatalogFilterValue>(initial);
  const [genresOpen, setGenresOpen] = useState(false);

  useEffect(() => {
    if (visible) setValue(initial);
  }, [visible, initial]);

  const genresLabel = useMemo(() => {
    if (!value.genres.length) return "Неважно";
    const names = (references?.genres ?? [])
      .filter((g) => value.genres.includes(g.id))
      .map((g) => g.name);
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  }, [value.genres, references]);

  const toggleString = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  return (
    <Modal
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "overFullScreen"}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Фильтр</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: 16 }}
        >
          <FieldLabel>Жанры</FieldLabel>
          <Pressable style={styles.selectBox} onPress={() => setGenresOpen(true)}>
            <Text style={styles.selectText}>{genresLabel}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.text.muted} />
          </Pressable>
          <Text style={styles.hint}>
            Будет искать релизы, содержащие каждый указанный жанр. Рекомендуется указывать не более 2–3 позиций.
          </Text>

          <FieldLabel>Категория</FieldLabel>
          <View style={styles.chipRow}>
            <ChipToggle
              label="Неважно"
              active={value.publishStatuses.length === 0}
              onPress={() => setValue((v) => ({ ...v, publishStatuses: [] }))}
            />
            {(references?.publish_statuses ?? []).map((s) => (
              <ChipToggle
                key={s.value}
                label={s.description || s.value}
                active={value.publishStatuses.includes(s.value)}
                onPress={() =>
                  setValue((v) => ({
                    ...v,
                    publishStatuses: toggleString(v.publishStatuses, s.value),
                  }))
                }
              />
            ))}
          </View>

          <FieldLabel>Тип</FieldLabel>
          <View style={styles.chipRow}>
            <ChipToggle
              label="Все"
              active={value.types.length === 0}
              onPress={() => setValue((v) => ({ ...v, types: [] }))}
            />
            {(references?.types ?? []).map((t) => (
              <ChipToggle
                key={t.value}
                label={t.description || t.value}
                active={value.types.includes(t.value)}
                onPress={() =>
                  setValue((v) => ({
                    ...v,
                    types: toggleString(v.types, t.value),
                  }))
                }
              />
            ))}
          </View>

          <FieldLabel>Сезон</FieldLabel>
          <View style={styles.chipRow}>
            <ChipToggle
              label="Все"
              active={value.seasons.length === 0}
              onPress={() => setValue((v) => ({ ...v, seasons: [] }))}
            />
            {(references?.seasons ?? []).map((s) => (
              <ChipToggle
                key={s.value}
                label={s.description || s.value}
                active={value.seasons.includes(s.value)}
                onPress={() =>
                  setValue((v) => ({
                    ...v,
                    seasons: toggleString(v.seasons, s.value),
                  }))
                }
              />
            ))}
          </View>

          <FieldLabel>Год</FieldLabel>
          <View style={styles.yearRow}>
            <TextInput
              style={styles.yearInput}
              placeholder="С года"
              placeholderTextColor={colors.text.faint}
              keyboardType="number-pad"
              value={value.fromYear ? String(value.fromYear) : ""}
              onChangeText={(t) => {
                const n = parseInt(t, 10);
                setValue((v) => ({ ...v, fromYear: Number.isFinite(n) ? n : null }));
              }}
            />
            <Text style={styles.yearSep}>—</Text>
            <TextInput
              style={styles.yearInput}
              placeholder="По год"
              placeholderTextColor={colors.text.faint}
              keyboardType="number-pad"
              value={value.toYear ? String(value.toYear) : ""}
              onChangeText={(t) => {
                const n = parseInt(t, 10);
                setValue((v) => ({ ...v, toYear: Number.isFinite(n) ? n : null }));
              }}
            />
          </View>

          <FieldLabel>Возрастной рейтинг</FieldLabel>
          <View style={styles.chipRow}>
            <ChipToggle
              label="Все"
              active={value.ageRatings.length === 0}
              onPress={() => setValue((v) => ({ ...v, ageRatings: [] }))}
            />
            {(references?.age_ratings ?? []).map((a) => (
              <ChipToggle
                key={a.value}
                label={a.label || a.value}
                active={value.ageRatings.includes(a.value)}
                onPress={() =>
                  setValue((v) => ({
                    ...v,
                    ageRatings: toggleString(v.ageRatings, a.value),
                  }))
                }
              />
            ))}
          </View>

          <FieldLabel>Сортировка</FieldLabel>
          <View style={styles.chipCol}>
            {(references?.sorting ?? []).map((s) => (
              <Pressable
                key={s.value}
                style={[
                  styles.sortRow,
                  value.sorting === s.value && styles.sortRowActive,
                ]}
                onPress={() => setValue((v) => ({ ...v, sorting: s.value }))}
              >
                <View
                  style={[
                    styles.radio,
                    value.sorting === s.value && styles.radioActive,
                  ]}
                />
                <Text style={styles.sortLabel}>{s.label || s.value}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            style={[styles.btn, styles.btnGhost]}
            onPress={() => setValue(DEFAULT_FILTER)}
          >
            <Text style={styles.btnGhostText}>Сбросить</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnPrimary]}
            onPress={() => {
              onApply(value);
              onClose();
            }}
          >
            <Text style={styles.btnPrimaryText}>Применить</Text>
          </Pressable>
        </View>

        <GenresPickerModal
          visible={genresOpen}
          genres={references?.genres ?? []}
          selected={value.genres}
          onClose={() => setGenresOpen(false)}
          onApply={(ids) => {
            setValue((v) => ({ ...v, genres: ids }));
            setGenresOpen(false);
          }}
        />
      </View>
    </Modal>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function ChipToggle({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function GenresPickerModal({
  visible,
  genres,
  selected,
  onClose,
  onApply,
}: {
  visible: boolean;
  genres: { id: number; name: string }[];
  selected: number[];
  onClose: () => void;
  onApply: (ids: number[]) => void;
}) {
  const [local, setLocal] = useState<number[]>(selected);
  useEffect(() => {
    if (visible) setLocal(selected);
  }, [visible, selected]);

  const allSelected = local.length === genres.length && genres.length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.gpBack} onPress={onClose}>
        <Pressable style={styles.gpCard} onPress={() => undefined}>
          <View style={styles.gpHead}>
            <Text style={styles.gpTitle}>Фильтр по жанрам</Text>
            <Pressable
              onPress={() => setLocal(allSelected ? [] : genres.map((g) => g.id))}
            >
              <Text style={styles.gpAll}>
                {allSelected ? "Снять все" : "Выбрать все"}
              </Text>
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 360 }}>
            {genres.map((g) => {
              const on = local.includes(g.id);
              return (
                <Pressable
                  key={g.id}
                  style={styles.gpRow}
                  onPress={() =>
                    setLocal((curr) =>
                      curr.includes(g.id)
                        ? curr.filter((x) => x !== g.id)
                        : [...curr, g.id],
                    )
                  }
                >
                  <View style={[styles.gpBox, on && styles.gpBoxOn]}>
                    {on ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : null}
                  </View>
                  <Text style={styles.gpName}>{g.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.gpFoot}>
            <Pressable onPress={() => setLocal([])} hitSlop={8}>
              <Text style={styles.gpReset}>Сбросить</Text>
            </Pressable>
            <Pressable onPress={() => onApply(local)} hitSlop={8}>
              <Text style={styles.gpPick}>Выбрать</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.base },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  fieldLabel: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.bg.border,
    backgroundColor: colors.bg.panel,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 46,
  },
  selectText: {
    color: colors.text.primary,
    fontSize: 14,
  },
  hint: {
    color: colors.text.muted,
    fontSize: 12,
    marginTop: -6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chipCol: {
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.bg.border,
    backgroundColor: colors.bg.panel,
  },
  chipActive: {
    backgroundColor: colors.brand[500],
    borderColor: colors.brand[500],
  },
  chipText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#fff",
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  yearInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.bg.border,
    backgroundColor: colors.bg.panel,
    borderRadius: radius.md,
    color: colors.text.primary,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
  },
  yearSep: {
    color: colors.text.muted,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.bg.border,
    backgroundColor: colors.bg.panel,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sortRowActive: {
    borderColor: colors.brand[500],
    backgroundColor: "rgba(244,63,94,0.08)",
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.bg.border,
  },
  radioActive: {
    borderColor: colors.brand[500],
    backgroundColor: colors.brand[500],
  },
  sortLabel: {
    color: colors.text.primary,
    fontSize: 14,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.bg.border,
    backgroundColor: colors.bg.base,
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: colors.bg.border,
    backgroundColor: colors.bg.panel,
  },
  btnPrimary: {
    backgroundColor: "#ffffff",
  },
  btnGhostText: {
    color: colors.text.primary,
    fontWeight: "700",
  },
  btnPrimaryText: {
    color: "#0a0613",
    fontWeight: "800",
  },
  gpBack: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  gpCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.bg.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.bg.border,
    padding: 16,
  },
  gpHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  gpTitle: {
    color: colors.text.primary,
    fontSize: 17,
    fontWeight: "800",
  },
  gpAll: {
    color: colors.brand[400],
    fontSize: 13,
    fontWeight: "700",
  },
  gpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  gpBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.bg.border,
    alignItems: "center",
    justifyContent: "center",
  },
  gpBoxOn: {
    backgroundColor: colors.brand[500],
    borderColor: colors.brand[500],
  },
  gpName: {
    color: colors.text.primary,
    fontSize: 14,
  },
  gpFoot: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.bg.border,
  },
  gpReset: {
    color: colors.text.muted,
    fontWeight: "700",
  },
  gpPick: {
    color: colors.brand[400],
    fontWeight: "800",
  },
});

