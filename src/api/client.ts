import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const DEFAULT_BASE = "https://natsumewatch-backend-wsjmfcnv.fly.dev";
const extraBase =
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ??
  DEFAULT_BASE;

export const API_BASE = extraBase.replace(/\/$/, "");
const API_PREFIX = `${API_BASE}/api`;

const TOKEN_KEY = "nw_token";

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null): Promise<void> {
  if (token === null) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export type FetchOptions = RequestInit & { skipAuth?: boolean };

export async function apiFetch<T = unknown>(
  path: string,
  init: FetchOptions = {},
): Promise<T> {
  const { skipAuth, headers, ...rest } = init;
  const headerObj: Record<string, string> = {
    "Content-Type": "application/json",
    ...((headers as Record<string, string>) || {}),
  };
  if (!skipAuth) {
    const t = await getToken();
    if (t) headerObj["Authorization"] = `Bearer ${t}`;
  }
  const url = path.startsWith("http") ? path : `${API_PREFIX}${path}`;
  const res = await fetch(url, { ...rest, headers: headerObj });
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const detail =
      (data && typeof data === "object" && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : null) || res.statusText;
    throw new ApiError(res.status, detail, data);
  }
  return data as T;
}

export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
}

/** Upload a file via multipart/form-data. The file is provided as a local URI. */
export async function uploadMultipart<T = unknown>(
  path: string,
  fieldName: string,
  fileUri: string,
  filename: string,
  mimeType: string,
): Promise<T> {
  const form = new FormData();
  form.append(fieldName, {
    uri: fileUri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  const headers: Record<string, string> = {};
  const t = await getToken();
  if (t) headers["Authorization"] = `Bearer ${t}`;

  const url = path.startsWith("http") ? path : `${API_PREFIX}${path}`;
  const res = await fetch(url, {
    method: "POST",
    body: form as unknown as BodyInit,
    headers,
  });
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : res.statusText;
    throw new ApiError(res.status, detail, data);
  }
  return data as T;
}
