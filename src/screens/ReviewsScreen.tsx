import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { apiFetch, resolveMediaUrl } from "../api/client";
import { useAuth } from "../store/auth";
import type { ReviewOut } from "../api/types";
import { colors, radius, spacing } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Reviews">;

export function ReviewsScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { releaseId, title } = route.params;
  const me = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reviewTitle, setReviewTitle] = useState("");
  const [body, setBody] = useState("");
  const [score, setScore] = useState<number>(8);

  const { data, isLoading } = useQuery<ReviewOut[]>({
    queryKey: ["reviews", releaseId],
    queryFn: () => apiFetch<ReviewOut[]>(`/anime/${releaseId}/reviews`),
  });

  const create = useMutation({
    mutationFn: (payload: { title: string; body: string; score: number }) =>
      apiFetch<ReviewOut>(`/anime/${releaseId}/reviews`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setOpen(false);
      setReviewTitle("");
      setBody("");
      setScore(8);
      qc.invalidateQueries({ queryKey: ["reviews", releaseId] });
    },
    onError: (e) => Alert.alert("Не отправлено", String((e as Error).message)),
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Рецензии</Text>
          {title ? <Text style={styles.subtitle} numberOfLines={1}>{title}</Text> : null}
        </View>
        {me ? (
          <Pressable
            style={styles.addBtn}
            onPress={() => {
              if (!me) return navigation.navigate("Login");
              setOpen(true);
            }}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Написать</Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: insets.bottom + 24,
            gap: 12,
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.muted}>Рецензий ещё нет</Text>
            </View>
          }
          renderItem={({ item }) => <ReviewCard r={item} />}
        />
      )}

      <Modal animationType="slide" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBack}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Новая рецензия</Text>
            <ScrollView contentContainerStyle={{ gap: 10 }}>
              <TextInput
                value={reviewTitle}
                onChangeText={setReviewTitle}
                placeholder="Заголовок"
                placeholderTextColor={colors.text.faint}
                style={styles.field}
              />
              <Text style={styles.scoreLabel}>Оценка: {score}</Text>
              <View style={styles.scoreRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => setScore(n)}
                    style={[
                      styles.scoreBtn,
                      n === score && {
                        backgroundColor: colors.brand[500],
                        borderColor: colors.brand[500],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.scoreBtnText,
                        n === score && { color: "#fff" },
                      ]}
                    >
                      {n}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="Текст рецензии"
                placeholderTextColor={colors.text.faint}
                style={[styles.field, { minHeight: 140, textAlignVertical: "top" }]}
                multiline
              />
            </ScrollView>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => setOpen(false)}
              >
                <Text style={styles.modalBtnGhostText}>Отмена</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  (!reviewTitle.trim() || !body.trim() || create.isPending) && { opacity: 0.5 },
                ]}
                disabled={!reviewTitle.trim() || !body.trim() || create.isPending}
                onPress={() => create.mutate({ title: reviewTitle.trim(), body: body.trim(), score })}
              >
                {create.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Опубликовать</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ReviewCard({ r }: { r: ReviewOut }) {
  const avatar = resolveMediaUrl(r.user.avatar_url);
  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarFallbackText}>{r.user.username[0]?.toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.username}>{r.user.username}</Text>
          <Text style={styles.date}>{new Date(r.created_at).toLocaleDateString()}</Text>
        </View>
        <View style={styles.scoreBadge}>
          <Ionicons name="star" size={12} color="#facc15" />
          <Text style={styles.scoreBadgeText}>{r.score}/10</Text>
        </View>
      </View>
      <Text style={styles.cardTitle}>{r.title}</Text>
      <Text style={styles.body}>{r.body}</Text>
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
  subtitle: { color: colors.text.muted, fontSize: 12 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brand[500],
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  addBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { paddingVertical: 60, alignItems: "center" },
  muted: { color: colors.text.muted },
  card: {
    backgroundColor: colors.bg.panel,
    borderWidth: 1,
    borderColor: colors.bg.border,
    borderRadius: radius.md,
    padding: 14,
    gap: 8,
  },
  headRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: {
    backgroundColor: colors.brand[600],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  username: { color: colors.text.primary, fontSize: 13, fontWeight: "700" },
  date: { color: colors.text.faint, fontSize: 11 },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(250,204,21,0.12)",
    borderRadius: 999,
  },
  scoreBadgeText: { color: "#facc15", fontSize: 12, fontWeight: "700" },
  cardTitle: { color: colors.text.primary, fontWeight: "700", fontSize: 15 },
  body: { color: colors.text.secondary, fontSize: 13, lineHeight: 19 },
  modalBack: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.bg.elevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    gap: 10,
    maxHeight: "85%",
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.bg.border,
    marginBottom: 8,
  },
  modalTitle: { color: colors.text.primary, fontWeight: "800", fontSize: 16, marginBottom: 4 },
  field: {
    backgroundColor: colors.bg.panel,
    borderWidth: 1,
    borderColor: colors.bg.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text.primary,
  },
  scoreLabel: { color: colors.text.muted, fontSize: 12, marginTop: 4 },
  scoreRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  scoreBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.bg.border,
    backgroundColor: colors.bg.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBtnText: { color: colors.text.primary, fontWeight: "700" },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnGhost: {
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  modalBtnGhostText: { color: colors.text.primary, fontWeight: "600" },
  modalBtnPrimary: { backgroundColor: colors.brand[500] },
  modalBtnPrimaryText: { color: "#fff", fontWeight: "700" },
});
