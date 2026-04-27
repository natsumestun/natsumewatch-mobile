import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../api/client";
import {
  LIST_STATUSES,
  STATUS_LABELS,
  type ListItem,
  type ListStatus,
} from "../api/types";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme/colors";

export function ListPicker({ releaseId }: { releaseId: number | string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const id =
    typeof releaseId === "number"
      ? releaseId
      : Number.parseInt(String(releaseId), 10);
  const enabled = Boolean(user) && Number.isFinite(id);

  const { data: current } = useQuery<ListItem | null>({
    queryKey: ["my-list", id],
    queryFn: async () => {
      try {
        return await apiFetch<ListItem>(`/me/lists/by-release/${id}`);
      } catch (e: unknown) {
        if (e && typeof e === "object" && "status" in e && (e as { status: number }).status === 404) {
          return null;
        }
        throw e;
      }
    },
    enabled,
  });

  const setMutation = useMutation({
    mutationFn: (status: ListStatus) =>
      apiFetch<ListItem>(`/me/lists`, {
        method: "PUT",
        body: JSON.stringify({ release_id: id, status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-list", id] }),
    onError: (e) => Alert.alert("Не удалось", String((e as Error).message)),
  });

  const removeMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/me/lists?release_id=${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-list", id] }),
    onError: (e) => Alert.alert("Не удалось", String((e as Error).message)),
  });

  if (!user) return null;

  const label = current ? STATUS_LABELS[current.status] : "Добавить в список";

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Ionicons
          name={current ? "bookmark" : "bookmark-outline"}
          size={16}
          color="#fff"
        />
        <Text style={styles.triggerText}>{label}</Text>
      </Pressable>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>В какой список?</Text>
            {LIST_STATUSES.map((s) => {
              const active = current?.status === s;
              return (
                <Pressable
                  key={s}
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => {
                    setMutation.mutate(s);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.rowText}>{STATUS_LABELS[s]}</Text>
                  {active ? (
                    <Ionicons name="checkmark" size={18} color={colors.brand[500]} />
                  ) : null}
                </Pressable>
              );
            })}
            {current ? (
              <Pressable
                style={[styles.row, styles.rowDanger]}
                onPress={() => {
                  removeMutation.mutate();
                  setOpen(false);
                }}
              >
                <Text style={[styles.rowText, styles.rowTextDanger]}>
                  Убрать из списков
                </Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  triggerText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.bg.panel,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: 6,
  },
  sheetTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: "transparent",
  },
  rowActive: {
    backgroundColor: "rgba(244,63,94,0.15)",
  },
  rowDanger: {
    marginTop: 6,
    backgroundColor: "rgba(244,63,94,0.08)",
  },
  rowText: {
    color: colors.text.primary,
    fontSize: 15,
  },
  rowTextDanger: {
    color: colors.brand[300],
  },
});
