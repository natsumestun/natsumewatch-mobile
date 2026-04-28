export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} ч ${rest} мин` : `${h} ч`;
}

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

export function parseServerTs(iso: string | null | undefined): number {
  if (!iso) return NaN;
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso);
  const normalized = hasTz ? iso : `${iso}Z`;
  return new Date(normalized).getTime();
}

export function formatDateTime(iso: string | null | undefined): string {
  const t = parseServerTs(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleString();
}

export function formatDate(iso: string | null | undefined): string {
  const t = parseServerTs(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleDateString();
}

export function formatRelative(iso: string | null | undefined): string {
  const t = parseServerTs(iso);
  if (!Number.isFinite(t)) return "";
  const diff = Math.max(0, Date.now() - t);
  const m = Math.round(diff / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} дн назад`;
  return new Date(t).toLocaleDateString();
}

export function dubLabel(
  source: { provider: string; studio: string; language?: string; kind?: string },
): string {
  const lang =
    source.language === "ru"
      ? "RU"
      : source.language === "en"
      ? "EN"
      : source.language === "ja"
      ? "JP"
      : "";
  const kind = source.kind === "subtitles" ? " (суб)" : "";
  return `${source.studio}${lang ? ` · ${lang}` : ""}${kind}`;
}
