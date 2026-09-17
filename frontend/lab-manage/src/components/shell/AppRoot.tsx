"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { AuthContext } from "@/lib/contexts";
import { LoginPage } from "@/features/auth/components/LoginPage";
import { NotifProvider } from "@/components/shell/NotifProvider";
import { AppShell } from "@/components/shell/AppShell";
import { APP_CSS } from "@/components/shell/styles";

// ─── Root App with Auth ──────────────────────────────────────────────
export default function AppRoot() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem("NGStock_token");
    if (token) {
      api.token = token;
      api.get("/auth/me")
        .then((u: any) => { setUser(u); setReady(true); })
        .catch(() => { api.token = null; localStorage.removeItem("NGStock_token"); setReady(true); });
    } else {
      setReady(true);
    }
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const data = await api.post("/auth/login", { email, password });
    api.token = data.access_token || data.token;
    localStorage.setItem("NGStock_token", api.token || "");
    const me = await api.get("/auth/me");
    setUser(me);
  };

  const logout = () => {
    api.token = null;
    localStorage.removeItem("NGStock_token");
    setUser(null);
  };

  if (!ready) return (
    <div className="lab-app" style={{ alignItems: "center", justifyContent: "center" }}>
      <div className="loading-bar" style={{ width: 200 }} />
    </div>
  );

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <NotifProvider>
        <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <style>{APP_CSS}</style>
      </>
        {user ? <AppShell user={user} onLogout={logout} /> : <LoginPage />}
      </NotifProvider>
    </AuthContext.Provider>
  );
}
