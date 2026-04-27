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

/** Resolve a bare poster path string (often returned by /me endpoints). */
export function posterAbs(p: string | null | undefined): string {
  if (!p) return "";
  if (/^https?:\/\//.test(p)) return p;
  return `${ANILIBRIA_BASE}${p}`;
}
