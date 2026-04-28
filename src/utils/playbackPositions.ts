import AsyncStorage from "@react-native-async-storage/async-storage";

export type PositionKeyParts = {
  releaseId: number | null | undefined;
  episodeOrdinal: number | null | undefined;
  sourceProvider?: string | null;
  sourceStudio?: string | null;
};

export type PositionRecord = {
  position: number;
  duration: number;
  updatedAt: number;
};

function buildKey(p: PositionKeyParts): string | null {
  if (!p.releaseId || !p.episodeOrdinal) return null;
  const provider = p.sourceProvider ?? "";
  const studio = p.sourceStudio ?? "";
  return `pos:${p.releaseId}:${p.episodeOrdinal}:${provider}:${studio}`;
}

export async function savePosition(
  parts: PositionKeyParts,
  position: number,
  duration: number,
): Promise<void> {
  const key = buildKey(parts);
  if (!key) return;
  if (!Number.isFinite(position) || position < 0) return;
  const rec: PositionRecord = {
    position,
    duration: Number.isFinite(duration) ? duration : 0,
    updatedAt: Date.now(),
  };
  try {
    await AsyncStorage.setItem(key, JSON.stringify(rec));
  } catch {
    /* ignore */
  }
}

export async function getPosition(
  parts: PositionKeyParts,
): Promise<PositionRecord | null> {
  const key = buildKey(parts);
  if (!key) return null;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<PositionRecord>;
    if (typeof p.position !== "number") return null;
    return {
      position: p.position,
      duration: typeof p.duration === "number" ? p.duration : 0,
      updatedAt: typeof p.updatedAt === "number" ? p.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

export async function getPositionsMap(
  partsList: PositionKeyParts[],
): Promise<Map<string, PositionRecord>> {
  const keys = partsList
    .map((p) => ({ p, k: buildKey(p) }))
    .filter((x): x is { p: PositionKeyParts; k: string } => Boolean(x.k));
  const out = new Map<string, PositionRecord>();
  if (!keys.length) return out;
  try {
    const pairs = await AsyncStorage.multiGet(keys.map((k) => k.k));
    for (const [k, v] of pairs) {
      if (!v) continue;
      try {
        const rec = JSON.parse(v) as PositionRecord;
        if (typeof rec.position === "number") out.set(k, rec);
      } catch {
        /* skip */
      }
    }
  } catch {
    /* skip */
  }
  return out;
}

export function positionKey(parts: PositionKeyParts): string | null {
  return buildKey(parts);
}
