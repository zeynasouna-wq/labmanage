"use client";

import { createContext } from "react";

export interface AuthContextType {
  user: { role: string; username: string; name?: string } | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────
export const AuthContext = createContext<AuthContextType | null>(null);
export const NotifContext = createContext<((message: string, type?: string) => void) | null>(null);
