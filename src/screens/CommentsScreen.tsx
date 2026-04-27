import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import type { CommentOut } from "../api/types";
import { colors, radius, spacing } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Comments">;

type ThreadNode = CommentOut & { children: ThreadNode[] };

function buildTree(items: CommentOut[]): ThreadNode[] {
  const byId = new Map<number, ThreadNode>();
  const roots: ThreadNode[] = [];
  for (const c of items) byId.set(c.id, { ...c, children: [] });
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRecursive = (n: ThreadNode[]) => {
    n.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    n.forEach((c) => sortRecursive(c.children));
  };
  sortRecursive(roots);
  return roots;
}

export function CommentsScreen({ route, navigation }: Props) {
  const { releaseId, title } = route.params;
  const insets = useSafeAreaInsets();
  const me = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CommentOut | null>(null);

  const { data, isLoading } = useQuery<CommentOut[]>({
    queryKey: ["comments", releaseId],
    queryFn: () => apiFetch<CommentOut[]>(`/anime/${releaseId}/comments`),
  });

  const post = useMutation({
    mutationFn: (body: { body: string; parent_id?: number }) =>
      apiFetch<CommentOut>(`/anime/${releaseId}/comments`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setText("");
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: ["comments", releaseId] });
    },
    onError: (e) => Alert.alert("Не отправлено", String((e as Error).message)),
  });

  const vote = useMutation({
    mutationFn: ({ id, value }: { id: number; value: -1 | 0 | 1 }) =>
      apiFetch(`/anime/${releaseId}/comments/${id}/vote`, {
        method: "POST",
        body: JSON.stringify({ value }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", releaseId] }),
  });

  const del = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/anime/${releaseId}/comments/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", releaseId] }),
  });

  const tree = buildTree(data ?? []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Комментарии</Text>
          {title ? <Text style={styles.subtitle} numberOfLines={1}>{title}</Text> : null}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      ) : (
        <FlatList
          data={tree}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: insets.bottom + 120,
            gap: 12,
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.muted}>Пока никто не комментировал</Text>
            </View>
          }
          renderItem={({ item }) => (
            <CommentTree
              node={item}
              myId={me?.id ?? null}
              onReply={(c) => setReplyTo(c)}
              onVote={(id, value) => vote.mutate({ id, value })}
              onDelete={(id) =>
                Alert.alert("Удалить комментарий?", undefined, [
                  { text: "Отмена", style: "cancel" },
                  { text: "Удалить", style: "destructive", onPress: () => del.mutate(id) },
                ])
              }
            />
          )}
        />
      )}

      {me ? (
        <View style={[styles.composer, { paddingBottom: insets.bottom + 8 }]}>
          {replyTo ? (
            <View style={styles.replyHint}>
              <Text style={styles.replyText} numberOfLines={1}>
                Ответ {replyTo.user.username}
              </Text>
              <Pressable onPress={() => setReplyTo(null)} hitSlop={6}>
                <Ionicons name="close" size={14} color={colors.text.muted} />
              </Pressable>
            </View>
          ) : null}
          <View style={styles.composerRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Написать комментарий..."
              placeholderTextColor={colors.text.faint}
              style={styles.input}
              multiline
            />
            <Pressable
              disabled={!text.trim() || post.isPending}
              onPress={() =>
                post.mutate({
                  body: text.trim(),
                  parent_id: replyTo?.id,
                })
              }
              style={[
                styles.sendBtn,
                (!text.trim() || post.isPending) && { opacity: 0.5 },
              ]}
            >
              {post.isPending ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={16} color="#fff" />}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={[styles.composer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            onPress={() => navigation.navigate("Login")}
            style={styles.loginPrompt}
          >
            <Text style={styles.loginText}>Войдите, чтобы оставить комментарий</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function CommentTree({
  node,
  myId,
  depth = 0,
  onReply,
  onVote,
  onDelete,
}: {
  node: ThreadNode;
  myId: number | null;
  depth?: number;
  onReply: (c: CommentOut) => void;
  onVote: (id: number, value: -1 | 0 | 1) => void;
  onDelete: (id: number) => void;
}) {
  const avatar = resolveMediaUrl(node.user.avatar_url);
  const my = node.vote_by_me ?? 0;
  return (
    <View style={[{ marginLeft: depth ? 16 : 0 }, styles.commentItem]}>
      <View style={styles.commentHead}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarFallbackText}>
              {node.user.username[0]?.toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.username}>{node.user.username}</Text>
          <Text style={styles.timestamp}>{new Date(node.created_at).toLocaleString()}</Text>
        </View>
      </View>
      <Text style={styles.body}>{node.body}</Text>
      <View style={styles.actionsRow}>
        <Pressable onPress={() => onVote(node.id, my === 1 ? 0 : 1)} style={styles.voteBtn}>
          <Ionicons
            name="arrow-up"
            size={14}
            color={my === 1 ? colors.brand[400] : colors.text.muted}
          />
          <Text style={styles.voteText}>{node.score ?? 0}</Text>
        </Pressable>
        <Pressable onPress={() => onVote(node.id, my === -1 ? 0 : -1)} style={styles.voteBtn}>
          <Ionicons
            name="arrow-down"
            size={14}
            color={my === -1 ? "#60a5fa" : colors.text.muted}
          />
        </Pressable>
        <Pressable onPress={() => onReply(node)} style={styles.replyBtn}>
          <Ionicons name="return-down-forward" size={14} color={colors.text.muted} />
          <Text style={styles.replyBtnText}>Ответить</Text>
        </Pressable>
        {myId && node.user.id === myId ? (
          <Pressable onPress={() => onDelete(node.id)} style={styles.replyBtn}>
            <Ionicons name="trash-outline" size={14} color={colors.text.muted} />
          </Pressable>
        ) : null}
      </View>
      {node.children.map((c) => (
        <CommentTree
          key={c.id}
          node={c}
          myId={myId}
          depth={depth + 1}
          onReply={onReply}
          onVote={onVote}
          onDelete={onDelete}
        />
      ))}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { paddingVertical: 60, alignItems: "center" },
  muted: { color: colors.text.muted },
  commentItem: {
    backgroundColor: colors.bg.panel,
    borderWidth: 1,
    borderColor: colors.bg.border,
    borderRadius: radius.md,
    padding: 12,
    gap: 8,
  },
  commentHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: {
    backgroundColor: colors.brand[600],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  username: { color: colors.text.primary, fontSize: 13, fontWeight: "700" },
  timestamp: { color: colors.text.faint, fontSize: 10 },
  body: { color: colors.text.primary, fontSize: 14, lineHeight: 19 },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  voteBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  voteText: { color: colors.text.muted, fontSize: 12, fontWeight: "700" },
  replyBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  replyBtnText: { color: colors.text.muted, fontSize: 12 },
  composer: {
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.bg.border,
    backgroundColor: colors.bg.base,
  },
  replyHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.bg.panel,
    borderRadius: radius.sm,
    marginBottom: 6,
  },
  replyText: { flex: 1, color: colors.text.muted, fontSize: 11 },
  composerRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: {
    flex: 1,
    color: colors.text.primary,
    backgroundColor: colors.bg.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 40,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand[500],
    alignItems: "center",
    justifyContent: "center",
  },
  loginPrompt: {
    alignItems: "center",
    paddingVertical: 12,
  },
  loginText: { color: colors.brand[400], fontWeight: "600" },
});
