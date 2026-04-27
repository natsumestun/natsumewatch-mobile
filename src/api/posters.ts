import type { Poster } from "./types";

const ANILIBRIA_BASE = "https://anilibria.top";

export function posterUrl(
  p: Poster | undefined | null,
  size: "src" | "preview" | "thumbnail" = "src",
): string | null {
  if (!p) return null;
  const opt = p.optimized?.[size];
  const fallback = p[size];
  const path = opt || fallback;
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${ANILIBRIA_BASE}${path}`;
}
