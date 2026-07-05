"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: "user" | "admin";
  createdAt: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "tp_auth_token";

async function fetchProfile(token: string): Promise<UserProfile> {
  const res = await fetch("/api/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Token invalid or expired");
  return res.json() as Promise<UserProfile>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrateFromToken = useCallback(async (t: string) => {
    try {
      const profile = await fetchProfile(t);
      setUser(profile);
      setToken(t);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      hydrateFromToken(stored).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [hydrateFromToken]);

  const login = useCallback(
    async (newToken: string) => {
      localStorage.setItem(TOKEN_KEY, newToken);
      await hydrateFromToken(newToken);
    },
    [hydrateFromToken]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
