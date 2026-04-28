import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiFetch } from "../api/client";
import { loadPrefs, presentLocalNotification } from "./notifications";

const SEEN_FRIENDS_KEY = "notif:friends:seen";
const SEEN_MSG_KEY = "notif:msg:seen";

type FriendRequest = {
  id: number;
  from_user?: { id: number; username: string } | null;
  user?: { id: number; username: string } | null;
};

type FriendEntry = {
  friendship_id?: number;
  user?: { id: number; username: string } | null;
};

type DirectMessage = {
  id: number;
  from_user_id: number;
  to_user_id: number;
  body?: string | null;
  text?: string | null;
  created_at?: string | null;
};

type ConversationResp = {
  user?: { id: number; username: string } | null;
  messages?: DirectMessage[];
};

async function getSeenSet(key: string): Promise<Set<number>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(Number) : []);
  } catch {
    return new Set();
  }
}

async function saveSeenSet(key: string, set: Set<number>): Promise<void> {
  try {
    const arr = Array.from(set).slice(-300);
    await AsyncStorage.setItem(key, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

export async function checkIncomingFriendRequests(myId: number): Promise<void> {
  const prefs = await loadPrefs();
  if (!prefs.enabled || !prefs.friendRequests) return;
  let list: FriendRequest[] = [];
  try {
    list = await apiFetch<FriendRequest[]>("/friends/incoming");
  } catch {
    return;
  }
  const seen = await getSeenSet(SEEN_FRIENDS_KEY);
  let dirty = false;
  for (const r of list) {
    if (seen.has(r.id)) continue;
    const from = r.from_user ?? r.user;
    if (!from) {
      seen.add(r.id);
      dirty = true;
      continue;
    }
    if (from.id === myId) continue;
    await presentLocalNotification(
      "Заявка в друзья",
      `${from.username} хочет добавить вас в друзья`,
      { type: "friend_request", from_user_id: from.id, request_id: r.id },
      "friends",
    );
    seen.add(r.id);
    dirty = true;
  }
  if (dirty) await saveSeenSet(SEEN_FRIENDS_KEY, seen);
}

export async function markChatSeen(
  peerUsername: string,
  messageIds: number[],
): Promise<void> {
  if (!messageIds.length) return;
  const seenKey = `${SEEN_MSG_KEY}:${peerUsername}`;
  const seen = await getSeenSet(seenKey);
  for (const id of messageIds) seen.add(id);
  await saveSeenSet(seenKey, seen);
}

async function checkChatWith(
  peerUsername: string,
  myId: number,
): Promise<void> {
  let resp: ConversationResp | DirectMessage[];
  try {
    resp = await apiFetch<ConversationResp | DirectMessage[]>(
      `/messages/${encodeURIComponent(peerUsername)}`,
    );
  } catch {
    return;
  }
  const messages = Array.isArray(resp) ? resp : resp?.messages ?? [];
  if (!messages.length) return;

  const seenKey = `${SEEN_MSG_KEY}:${peerUsername}`;
  const seen = await getSeenSet(seenKey);
  const firstSync = seen.size === 0;
  let dirty = false;

  for (const m of messages) {
    if (seen.has(m.id)) continue;
    const fromPeer = m.from_user_id !== myId && m.to_user_id === myId;
    if (firstSync) {
      seen.add(m.id);
      dirty = true;
      continue;
    }
    if (!fromPeer) {
      seen.add(m.id);
      dirty = true;
      continue;
    }
    const body = (m.body ?? m.text ?? "").trim() || "Новое сообщение";
    await presentLocalNotification(
      peerUsername,
      body.length > 120 ? body.slice(0, 117) + "…" : body,
      { type: "chat_message", peer_username: peerUsername, message_id: m.id },
      "chat",
    );
    seen.add(m.id);
    dirty = true;
  }
  if (dirty) await saveSeenSet(seenKey, seen);
}

async function checkAllFriendChats(myId: number): Promise<void> {
  const prefs = await loadPrefs();
  if (!prefs.enabled || !prefs.chatMessages) return;
  let friends: FriendEntry[] = [];
  try {
    friends = await apiFetch<FriendEntry[]>("/friends");
  } catch {
    return;
  }
  // Cap to reasonable number to avoid bursts
  const usernames = friends
    .map((f) => f.user?.username)
    .filter((u): u is string => !!u)
    .slice(0, 25);
  for (const u of usernames) {
    // sequential to keep load light
    await checkChatWith(u, myId);
  }
}

/**
 * On app foreground (and after login), poll incoming friend requests
 * and unread chat messages with all friends, firing local notifications
 * for new ones since the last poll. Best-effort.
 */
export async function pollSocialOnForeground(myId: number): Promise<void> {
  await checkIncomingFriendRequests(myId);
  await checkAllFriendChats(myId);
}
