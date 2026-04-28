import { useEffect, useRef, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { apiFetch } from "../api/client";
import type { ConversationResponse, MessageOut } from "../api/types";
import { useAuth } from "../store/auth";
import { colors, radius, spacing } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Chat">;

export function ChatScreen({ route, navigation }: Props) {
  const { username } = route.params;
  const insets = useSafeAreaInsets();
  const me = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const listRef = useRef<FlatList<MessageOut>>(null);

  const { data, isLoading } = useQuery<ConversationResponse>({
    queryKey: ["chat", username],
    queryFn: () =>
      apiFetch<ConversationResponse>(`/messages/${encodeURIComponent(username)}`),
    refetchInterval: 8000,
  });

  const send = useMutation({
    mutationFn: (body: string) =>
      apiFetch<MessageOut>(`/messages/${encodeURIComponent(username)}`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["chat", username] });
    },
    onError: (e) => Alert.alert("Не отправлено", String((e as Error).message)),
  });

  const messages = (data?.messages ?? []).slice().sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  useEffect(() => {
    if (messages.length) {
      requestAnimationFrame(() => {
        try {
          listRef.current?.scrollToEnd({ animated: false });
        } catch {}
      });
    }
  }, [messages.length]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>{data?.user?.username || username}</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: spacing.lg, gap: 6 }}
          renderItem={({ item }) => {
            const mine = item.from_user_id === me?.id;
            return (
              <View
                style={[
                  styles.bubble,
                  mine ? styles.bubbleMine : styles.bubbleTheirs,
                ]}
              >
                <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>
                  {item.body}
                </Text>
                <Text
                  style={[
                    styles.bubbleTime,
                    mine ? { color: "rgba(255,255,255,0.65)" } : undefined,
                  ]}
                >
                  {formatTime(item.created_at)}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.muted}>Сообщений пока нет — напишите первым.</Text>
            </View>
          }
        />
      )}

      <View style={[styles.inputWrap, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Сообщение..."
          placeholderTextColor={colors.text.faint}
          style={styles.input}
          multiline
          maxLength={4000}
        />
        <Pressable
          disabled={!text.trim() || send.isPending}
          onPress={() => send.mutate(text.trim())}
          style={[
            styles.sendBtn,
            (!text.trim() || send.isPending) && { opacity: 0.5 },
          ]}
        >
          {send.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatTime(iso: string) {
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso);
  const d = new Date(hasTz ? iso : `${iso}Z`);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.border,
  },
  title: { color: colors.text.primary, fontSize: 16, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { paddingVertical: 60, alignItems: "center" },
  muted: { color: colors.text.muted },
  bubble: {
    maxWidth: "80%",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: colors.brand[500],
  },
  bubbleTheirs: {
    alignSelf: "flex-start",
    backgroundColor: colors.bg.panel,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  bubbleText: { color: colors.text.primary, fontSize: 14, lineHeight: 19 },
  bubbleTextMine: { color: "#fff", fontSize: 14, lineHeight: 19 },
  bubbleTime: { color: colors.text.faint, fontSize: 10, alignSelf: "flex-end" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.bg.border,
    backgroundColor: colors.bg.base,
  },
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
});
