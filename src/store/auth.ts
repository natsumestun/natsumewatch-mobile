import { create } from "zustand";
import { apiFetch, setToken } from "../api/client";
import type { AuthResponse, User } from "../api/types";
import { clearPushToken } from "../utils/notifications";

type AuthState = {
  user: User | null;
  loading: boolean;
  init: () => Promise<void>;
  login: (email_or_username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
  loginWithToken: (token: string) => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  async init() {
    set({ loading: true });
    try {
      const me = await apiFetch<User>("/auth/me");
      set({ user: me, loading: false });
    } catch {
      await setToken(null);
      set({ user: null, loading: false });
    }
  },
  async login(email_or_username, password) {
    const data = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email_or_username, password }),
      skipAuth: true,
    });
    await setToken(data.access_token);
    set({ user: data.user });
  },
  async register(username, email, password) {
    const data = await apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
      skipAuth: true,
    });
    await setToken(data.access_token);
    set({ user: data.user });
  },
  async logout() {
    await clearPushToken().catch(() => undefined);
    await setToken(null);
    set({ user: null });
  },
  async refresh() {
    if (!get().user) return;
    try {
      const me = await apiFetch<User>("/auth/me");
      set({ user: me });
    } catch {
      await setToken(null);
      set({ user: null });
    }
  },
  setUser(user: User) {
    set({ user });
  },
  async loginWithToken(token: string) {
    await setToken(token);
    try {
      const me = await apiFetch<User>("/auth/me");
      set({ user: me });
    } catch {
      await setToken(null);
      set({ user: null });
      throw new Error("Не удалось получить профиль после OAuth");
    }
  },
}));
