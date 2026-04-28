import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiFetch } from "../api/client";
import { loadPrefs, presentLocalNotification } from "./notifications";

const SUBS_KEY = "subs:anime:v1";
const COUNTS_KEY = "subs:counts:v1";

export type AnimeSubscription = {
  id: number;
  alias: string | null;
  title: string;
  poster: string | null;
  addedAt: number;
};

export async function loadSubscriptions(): Promise<AnimeSubscription[]> {
  try {
    const raw = await AsyncStorage.getItem(SUBS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is AnimeSubscription =>
        x && typeof x === "object" && typeof x.id === "number",
    );
  } catch {
    return [];
  }
}

async function saveSubscriptions(subs: AnimeSubscription[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SUBS_KEY, JSON.stringify(subs));
  } catch {
    /* ignore */
  }
}

export async function isSubscribed(id: number): Promise<boolean> {
  const list = await loadSubscriptions();
  return list.some((s) => s.id === id);
}

export async function subscribe(s: AnimeSubscription): Promise<void> {
  const list = await loadSubscriptions();
  if (list.some((x) => x.id === s.id)) return;
  await saveSubscriptions([...list, s]);
  // Best-effort backend sync — endpoint may not exist yet
  apiFetch("/me/anime-subscriptions", {
    method: "POST",
    body: JSON.stringify({ release_id: s.id }),
  }).catch(() => undefined);
}

export async function unsubscribe(id: number): Promise<void> {
  const list = await loadSubscriptions();
  const next = list.filter((x) => x.id !== id);
  if (next.length === list.length) return;
  await saveSubscriptions(next);
  apiFetch(`/me/anime-subscriptions/${id}`, {
    method: "DELETE",
  }).catch(() => undefined);
}

type CountsMap = Record<string, number>;

async function loadCounts(): Promise<CountsMap> {
  try {
    const raw = await AsyncStorage.getItem(COUNTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as CountsMap) : {};
  } catch {
    return {};
  }
}

async function saveCounts(map: CountsMap): Promise<void> {
  try {
    await AsyncStorage.setItem(COUNTS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

type ReleaseDetail = {
  id: number;
  alias?: string | null;
  name: { main: string };
  episodes_total?: number | null;
  episodes?: Array<{ ordinal: number }>;
};

/**
 * Polls each subscribed anime and fires a local notification if a new
 * episode appeared since last check. Best-effort, runs whenever the app
 * comes to the foreground.
 */
export async function checkSubscriptionsForNewEpisodes(): Promise<void> {
  const prefs = await loadPrefs();
  if (!prefs.enabled || !prefs.newEpisodes) return;
  const subs = await loadSubscriptions();
  if (!subs.length) return;
  const counts = await loadCounts();
  const next: CountsMap = { ...counts };
  let dirty = false;

  for (const sub of subs) {
    const id = String(sub.id);
    try {
      const data = await apiFetch<ReleaseDetail>(`/anime/${sub.alias ?? sub.id}`);
      const total =
        (typeof data.episodes_total === "number" ? data.episodes_total : null) ??
        (Array.isArray(data.episodes) ? data.episodes.length : 0);
      if (!total) continue;
      const previous = counts[id];
      if (typeof previous !== "number") {
        next[id] = total;
        dirty = true;
        continue;
      }
      if (total > previous) {
        const delta = total - previous;
        await presentLocalNotification(
          sub.title || data.name.main,
          delta === 1
            ? `Вышла ${total} серия`
            : `Вышло ${delta} новых серий (всего ${total})`,
          {
            type: "new_episode",
            release_id: sub.id,
            alias: sub.alias,
          },
          "episodes",
        );
        next[id] = total;
        dirty = true;
      }
    } catch {
      /* swallow per-anime errors */
    }
  }
  if (dirty) await saveCounts(next);
}
