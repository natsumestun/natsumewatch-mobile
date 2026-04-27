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
