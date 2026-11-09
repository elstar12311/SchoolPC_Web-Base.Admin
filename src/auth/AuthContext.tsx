import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, apiRequest } from "../api";

export interface AdminIdentity {
  full_name: string;
  username: string;
  role: string;
}

interface AuthContextValue {
  user: AdminIdentity | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => void;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadCounter, setReloadCounter] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    apiRequest<AdminIdentity>("/api/auth/me")
      .then((identity) => {
        if (active) setUser(identity);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 401) {
          setUser(null);
          return;
        }
        setError("UIC Admin could not contact the server. Check that it is running.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadCounter]);

  const login = useCallback(async (username: string, password: string) => {
    const identity = await apiRequest<AdminIdentity>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setUser(identity);
    setError(null);
  }, []);

  const logout = useCallback(async () => {
    await apiRequest<void>("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const reload = useCallback(() => setReloadCounter((count) => count + 1), []);
  const clearError = useCallback(() => setError(null), []);
  const value = useMemo(
    () => ({ user, loading, error, login, logout, reload, clearError }),
    [user, loading, error, login, logout, reload, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return value;
}
