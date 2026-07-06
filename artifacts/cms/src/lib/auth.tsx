import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api, setToken, getToken } from "./api";
import { identify as identifyAnalytics, reset as resetAnalytics, track } from "./analytics";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
  login: (username: string, pin: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      api.verify().then(() => {
        const restored = localStorage.getItem("cms_username") || "admin";
        setIsAuthenticated(true);
        setUsername(restored);
        identifyAnalytics(restored);
      }).catch(() => {
        setToken(null);
      }).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (user: string, pin: string) => {
    const res = await api.login(user, pin);
    setToken(res.token);
    localStorage.setItem("cms_username", res.username);
    setUsername(res.username);
    setIsAuthenticated(true);
    identifyAnalytics(res.username);
    track("cms_admin_logged_in", { username: res.username });
  };

  const logout = () => {
    track("cms_admin_logged_out", { username });
    setToken(null);
    localStorage.removeItem("cms_username");
    setUsername(null);
    setIsAuthenticated(false);
    resetAnalytics();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
