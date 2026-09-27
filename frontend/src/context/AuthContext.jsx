import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import api from "../lib/api.js";
import { useToast } from "./ToastContext.jsx";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const userRef = useRef(null);
  const leaving = useRef(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/session");
      setUser(data.authenticated ? data.user : null);
      return data.authenticated ? data.user : null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onUnauthorized = () => {
      const wasSignedIn = !!userRef.current;
      setUser(null);
      if (wasSignedIn && !leaving.current) {
        toast("Your session has ended. Please sign in again to continue.", "error");
      }
    };
    window.addEventListener("ra:unauthorized", onUnauthorized);
    return () => window.removeEventListener("ra:unauthorized", onUnauthorized);
  }, [toast]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    leaving.current = false;
    setUser(data);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    leaving.current = false;
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    leaving.current = true;
    await api.post("/auth/logout").catch(() => {});
    setUser(null);
    // Prefetch a fresh CSRF token for the next sign-in.
    await api.get("/auth/session").catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ user, ready, isAdmin: user?.role === "ADMIN", setUser, login, register, logout, refresh }),
    [user, ready, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
