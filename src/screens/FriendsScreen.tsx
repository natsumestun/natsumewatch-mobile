import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import type {
  FriendOut,
  FriendRequestOut,
  UserPublic,
} from "../api/types";
import { colors, radius, spacing } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Friends">;

type Tab = "friends" | "incoming" | "outgoing" | "search";

export function FriendsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("friends");
  const [query, setQuery] = useState("");

  const friendsQ = useQuery<FriendOut[]>({
    queryKey: ["friends"],
    queryFn: () => apiFetch<FriendOut[]>("/friends"),
  });
  const incomingQ = useQuery<FriendRequestOut[]>({
    queryKey: ["friends", "incoming"],
    queryFn: () => apiFetch<FriendRequestOut[]>("/friends/incoming"),
  });
  const outgoingQ = useQuery<FriendRequestOut[]>({
    queryKey: ["friends", "outgoing"],
    queryFn: () => apiFetch<FriendRequestOut[]>("/friends/outgoing"),
  });
  const searchQ = useQuery<UserPublic[]>({
    queryKey: ["friends", "search", query],
    queryFn: () =>
      apiFetch<UserPublic[]>(
        `/friends/search?q=${encodeURIComponent(query.trim())}`,
      ),
    enabled: tab === "search" && query.trim().length >= 2,
  });

  const sendRequest = useMutation({
    mutationFn: (target: string) =>
      apiFetch("/friends/request", {
        method: "POST",
        body: JSON.stringify({ target }),
      }),
    onSuccess: () => {
      Alert.alert("Заявка отправлена");
      qc.invalidateQueries({ queryKey: ["friends"] });
    },
    onError: (e) => Alert.alert("Не удалось", String((e as Error).message)),
  });

  const accept = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/friends/${id}/accept`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friends"] }),
  });
  const decline = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/friends/${id}/decline`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friends"] }),
  });
  const remove = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/friends/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friends"] }),
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>Друзья</Text>
      </View>

      <View style={styles.tabs}>
        <TabBtn label="Друзья" active={tab === "friends"} onPress={() => setTab("friends")} />
        <TabBtn
          label={`Входящие${incomingQ.data?.length ? ` (${incomingQ.data.length})` : ""}`}
          active={tab === "incoming"}
          onPress={() => setTab("incoming")}
        />
        <TabBtn label="Исходящие" active={tab === "outgoing"} onPress={() => setTab("outgoing")} />
        <TabBtn label="Поиск" active={tab === "search"} onPress={() => setTab("search")} />
      </View>

      {tab === "search" ? (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.text.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Имя пользователя или email"
            placeholderTextColor={colors.text.faint}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      ) : null}

      {tab === "friends" && (
        <Listing
          loading={friendsQ.isLoading}
          empty="У вас пока нет друзей"
          data={friendsQ.data ?? []}
          keyExtractor={(f) => String(f.friendship_id)}
          renderItem={(f) => (
            <Row
              user={f.user}
              right={
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <SmallBtn
                    icon="chatbubble-ellipses-outline"
                    onPress={() =>
                      navigation.navigate("Chat", {
                        userId: f.user.id,
                        username: f.user.username,
                      })
                    }
                  />
                  <SmallBtn
                    icon="person-remove-outline"
                    danger
                    onPress={() =>
                      Alert.alert(
                        "Удалить друга?",
                        f.user.username,
                        [
                          { text: "Отмена", style: "cancel" },
                          {
                            text: "Удалить",
                            style: "destructive",
                            onPress: () => remove.mutate(f.friendship_id),
                          },
                        ],
                      )
                    }
                  />
                </View>
              }
            />
          )}
        />
      )}

      {tab === "incoming" && (
        <Listing
          loading={incomingQ.isLoading}
          empty="Нет входящих заявок"
          data={incomingQ.data ?? []}
          keyExtractor={(r) => String(r.id)}
          renderItem={(r) => (
            <Row
              user={r.user}
              right={
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <SmallBtn icon="checkmark" primary onPress={() => accept.mutate(r.id)} />
                  <SmallBtn icon="close" onPress={() => decline.mutate(r.id)} />
                </View>
              }
            />
          )}
        />
      )}

      {tab === "outgoing" && (
        <Listing
          loading={outgoingQ.isLoading}
          empty="Нет исходящих заявок"
          data={outgoingQ.data ?? []}
          keyExtractor={(r) => String(r.id)}
          renderItem={(r) => (
            <Row
              user={r.user}
              right={
                <SmallBtn
                  icon="close"
                  onPress={() => decline.mutate(r.id)}
                />
              }
            />
          )}
        />
      )}

      {tab === "search" && (
        <Listing
          loading={searchQ.isFetching}
          empty={query.trim().length < 2 ? "Введите минимум 2 символа" : "Никого не найдено"}
          data={searchQ.data ?? []}
          keyExtractor={(u) => String(u.id)}
          renderItem={(u) => (
            <Row
              user={u}
              right={
                <SmallBtn
                  icon="person-add-outline"
                  primary
                  onPress={() => sendRequest.mutate(u.username)}
                />
              }
            />
          )}
        />
      )}
    </View>
  );
}

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function Row({ user, right }: { user: UserPublic; right?: React.ReactNode }) {
  const avatar = resolveMediaUrl(user.avatar_url);
  return (
    <View style={styles.row}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarFallbackText}>
            {user.username[0]?.toUpperCase()}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.username}>{user.username}</Text>
        {user.bio ? (
          <Text style={styles.bio} numberOfLines={1}>
            {user.bio}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

function SmallBtn({
  icon,
  onPress,
  primary,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.smallBtn,
        primary && { backgroundColor: colors.brand[500] },
        danger && { backgroundColor: "rgba(244,63,94,0.18)" },
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={primary ? "#fff" : danger ? colors.brand[400] : colors.text.primary}
      />
    </Pressable>
  );
}

function Listing<T>({
  data,
  loading,
  empty,
  keyExtractor,
  renderItem,
}: {
  data: T[];
  loading: boolean;
  empty: string;
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => React.ReactElement;
}) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand[500]} />
      </View>
    );
  }
  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => renderItem(item)}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      contentContainerStyle={{ paddingBottom: 24 }}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Text style={styles.muted}>{empty}</Text>
        </View>
      }
    />
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
  tabs: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: 6,
    marginBottom: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.bg.panel,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  tabActive: {
    backgroundColor: colors.brand[500],
    borderColor: colors.brand[500],
  },
  tabLabel: { color: colors.text.secondary, fontSize: 12, fontWeight: "600" },
  tabLabelActive: { color: "#fff" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: spacing.lg,
    marginBottom: 10,
    backgroundColor: colors.bg.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: 14, padding: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand[600],
  },
  avatarFallbackText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  username: { color: colors.text.primary, fontWeight: "700", fontSize: 14 },
  bio: { color: colors.text.muted, fontSize: 12 },
  smallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg.panel,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  sep: { height: 1, backgroundColor: colors.bg.border, marginHorizontal: spacing.lg },
  center: { paddingVertical: 60, alignItems: "center" },
  emptyWrap: { paddingVertical: 60, alignItems: "center" },
  muted: { color: colors.text.muted },
});
