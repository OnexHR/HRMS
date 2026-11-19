import { createContext, useContext, useMemo, type ReactNode } from "react";

type AuthContextValue = {
  logout: () => void;
  token: string | null;
  updateProfile: (payload: unknown) => Promise<{ success: boolean; error?: string }>;
};

const AuthContext = createContext<AuthContextValue>({
  logout: () => {},
  token: null,
  updateProfile: async () => ({ success: false, error: "Not available" }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(() => ({
    token: localStorage.getItem("token"),
    logout: () => {
      localStorage.removeItem("token");
    },
    updateProfile: async (payload) => {
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return { success: false, error: "Could not update profile." };
      return { success: true };
    },
  }), []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
