"use client";

import { useState, useEffect, useCallback, createContext, useContext, useRef, ReactNode } from "react";
import { PermissionService } from "@/lib/permissions";

// ─── Type Definitions ────────────────────────────────────────────────
interface Product {
  id: number;
  code: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  alert_stock?: number;
  supplier_id: number | null;
  location_id: number | null;
  category_id: number | null;
  threshold?: number;
  stock?: number;
}

interface ProductLot {
  id: number;
  product_id: number;
  lot_number: string;
  quantity: number;
  expiry_date: string | null;
  notes: string | null;
}

interface StockMovement {
  id: number;
  product_id: number;
  movement_type: string;
  quantity: number;
  stock_before: number;
  stock_after: number;
  notes?: string;
  created_at: string;
  product?: Product;
}

interface Supplier {
  id: number;
  name: string;
}

interface Location {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

interface AuthContextType {
  user: { role: string; username: string; name?: string } | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ─── API Configuration ───────────────────────────────────────────────
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

// ─── Context ─────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);
const NotifContext = createContext<((message: string, type?: string) => void) | null>(null);

// ─── API Service Layer ───────────────────────────────────────────────
const api = {
  token: null as string | null,
  async request(method: string, path: string, body: Record<string, unknown> | null = null) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    const opts: { method: string; headers: Record<string, string>; body?: string } = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(`${API_BASE}${path}`, opts);
      if (res.status === 401) {
        this.token = null;
        localStorage.removeItem("NGStock_token");
        window.location.reload();
        throw new Error("Session expirée");
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Erreur ${res.status}`);
      }
      if (res.status === 204) return null;
      return res.json();
    } catch (error) {
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new Error(`Impossible de contacter le serveur (${API_BASE}). Assurez-vous que le backend est en cours d'exécution.`);
      }
      throw error;
    }
  },
  get: (p: string) => api.request("GET", p),
  post: (p: string, b: Record<string, unknown>) => api.request("POST", p, b),
  patch: (p: string, b: Record<string, unknown>) => api.request("PATCH", p, b),
  del: (p: string) => api.request("DELETE", p),
};

// ─── Icons (inline SVG components) ──────────────────────────────────
const icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
  ),
  products: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
  ),
  suppliers: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  movements: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  ),
  close: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
  edit: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
  ),
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
  ),
  chevDown: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
  ),
  download: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  ),
  flask: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6"/><path d="M10 3v6.5L4 18a1 1 0 0 0 .87 1.5h14.26A1 1 0 0 0 20 18l-6-8.5V3"/><path d="M7 15h10"/></svg>
  ),
  arrowIn: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="5 12 12 19 19 12"/><line x1="12" y1="3" x2="12" y2="19"/></svg>
  ),
  arrowOut: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="5 12 12 5 19 12"/><line x1="12" y1="21" x2="12" y2="5"/></svg>
  ),
  lot: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
  ),
};

// ─── Styles ──────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');

:root {
  --bg-primary: #0B0E13;
  --bg-secondary: #111620;
  --bg-tertiary: #171D2A;
  --bg-card: #161C28;
  --bg-hover: #1C2435;
  --bg-input: #111620;
  --border: #1E2738;
  --border-focus: #2DD4A8;
  --text-primary: #E8ECF4;
  --text-secondary: #8892A6;
  --text-muted: #5A6478;
  --accent: #2DD4A8;
  --accent-dim: rgba(45, 212, 168, 0.12);
  --accent-hover: #24B890;
  --danger: #F0566A;
  --danger-dim: rgba(240, 86, 106, 0.12);
  --warning: #F0A848;
  --warning-dim: rgba(240, 168, 72, 0.12);
  --info: #5B8DEF;
  --info-dim: rgba(91, 141, 239, 0.12);
  --radius: 8px;
  --radius-lg: 12px;
  --shadow: 0 2px 12px rgba(0,0,0,0.3);
  --font-mono: 'JetBrains Mono', monospace;
  --font-sans: 'Outfit', sans-serif;
  --sidebar-width: 240px;
  --topbar-height: 0px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: var(--bg-primary); }

.lab-app {
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: var(--bg-primary);
  min-height: 100vh;
  display: flex;
}

/* ── Sidebar ── */
.sidebar {
  width: var(--sidebar-width);
  min-height: 100vh;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
}
.sidebar-brand {
  padding: 24px 20px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border);
}
.sidebar-brand .brand-icon {
  color: var(--accent);
  display: flex;
  align-items: center;
}
.sidebar-brand h1 {
  font-family: var(--font-mono);
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--text-primary);
}
.sidebar-brand .version {
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: auto;
}
.sidebar-nav { padding: 16px 12px; flex: 1; }
.sidebar-section-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 12px 8px 6px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 14px;
  font-weight: 450;
  color: var(--text-secondary);
  transition: all 0.15s ease;
  margin-bottom: 2px;
}
.nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
.nav-item.active {
  background: var(--accent-dim);
  color: var(--accent);
  font-weight: 550;
}
.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border);
}
.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: var(--radius);
  cursor: pointer;
}
.sidebar-user:hover { background: var(--bg-hover); }
.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent-dim);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  font-family: var(--font-mono);
}
.user-info { flex: 1; min-width: 0; }
.user-name { font-size: 13px; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-role { font-size: 11px; color: var(--text-muted); }

/* ── Main Content ── */
.main-content {
  margin-left: var(--sidebar-width);
  flex: 1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.page-header {
  padding: 28px 32px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.page-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.3px;
}
.page-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}
.page-body { padding: 20px 32px 32px; flex: 1; }

/* ── Cards & Stats ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  transition: border-color 0.2s;
}
.stat-card:hover { border-color: var(--accent); }
.stat-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--text-primary);
  letter-spacing: -1px;
}
.stat-sub {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* ── Table ── */
.table-container {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.table-toolbar {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border);
}
.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 12px;
  flex: 1;
  max-width: 320px;
  transition: border-color 0.15s;
}
.search-input-wrap:focus-within { border-color: var(--border-focus); }
.search-input-wrap svg { color: var(--text-muted); flex-shrink: 0; }
.search-input-wrap input {
  border: none;
  background: none;
  outline: none;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 13px;
  width: 100%;
}
.search-input-wrap input::placeholder { color: var(--text-muted); }

table { width: 100%; border-collapse: collapse; }
thead th {
  padding: 12px 20px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
}
tbody td {
  padding: 14px 20px;
  font-size: 13.5px;
  border-bottom: 1px solid var(--border);
  color: var(--text-secondary);
}
tbody tr { transition: background 0.1s; }
tbody tr:hover { background: var(--bg-hover); }
tbody tr:last-child td { border-bottom: none; }
td .cell-main { color: var(--text-primary); font-weight: 500; }
td .cell-sub { font-size: 12px; color: var(--text-muted); }

/* ── Badges ── */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
  font-family: var(--font-mono);
}
.badge-accent { background: var(--accent-dim); color: var(--accent); }
.badge-danger { background: var(--danger-dim); color: var(--danger); }
.badge-warning { background: var(--warning-dim); color: var(--warning); }
.badge-info { background: var(--info-dim); color: var(--info); }
.badge-muted { background: var(--bg-tertiary); color: var(--text-muted); }

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: var(--radius);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 550;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.btn-primary { background: var(--accent); color: #0B0E13; }
.btn-primary:hover { background: var(--accent-hover); }
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
}
.btn-ghost:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--text-muted); }
.btn-danger { background: var(--danger-dim); color: var(--danger); }
.btn-danger:hover { background: var(--danger); color: white; }
.btn-sm { padding: 6px 12px; font-size: 12px; }
.btn-icon {
  padding: 7px;
  border-radius: var(--radius);
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: all 0.15s;
}
.btn-icon:hover { background: var(--bg-hover); color: var(--text-primary); }

/* ── Forms ── */
.form-group { margin-bottom: 16px; }
.form-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
  letter-spacing: 0.3px;
}
.form-input, .form-select {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}
.form-input:focus, .form-select:focus { border-color: var(--border-focus); }
.form-input::placeholder { color: var(--text-muted); }
.form-select { appearance: none; cursor: pointer; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

/* ── Modal ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(4px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.15s ease;
}
.modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: var(--shadow);
  animation: slideUp 0.2s ease;
}
.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.modal-header h3 { font-size: 16px; font-weight: 600; }
.modal-body { padding: 24px; }
.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

/* ── Notifications ── */
.notif-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.notif {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 16px;
  font-size: 13px;
  color: var(--text-primary);
  box-shadow: var(--shadow);
  animation: slideIn 0.2s ease;
  max-width: 360px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.notif.success { border-left: 3px solid var(--accent); }
.notif.error { border-left: 3px solid var(--danger); }
@keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

/* ── Login ── */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  position: relative;
  overflow: hidden;
}
.login-bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--border) 1px, transparent 1px),
    linear-gradient(90deg, var(--border) 1px, transparent 1px);
  background-size: 60px 60px;
  opacity: 0.3;
}
.login-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 40px;
  width: 100%;
  max-width: 400px;
  position: relative;
  z-index: 1;
  box-shadow: var(--shadow);
}
.login-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
}
.login-brand h1 {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.5px;
}
.login-brand .brand-icon { color: var(--accent); display: flex; }
.login-error {
  background: var(--danger-dim);
  color: var(--danger);
  padding: 10px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  margin-bottom: 16px;
}

/* ── Action buttons cell ── */
.action-cell { display: flex; gap: 4px; }

/* ── Loading ── */
.loading-bar {
  height: 2px;
  background: var(--bg-tertiary);
  position: relative;
  overflow: hidden;
  border-radius: 2px;
  margin: 20px 0;
}
.loading-bar::after {
  content: '';
  position: absolute;
  top: 0;
  left: -40%;
  width: 40%;
  height: 100%;
  background: var(--accent);
  animation: loadSlide 1s ease infinite;
}
@keyframes loadSlide { to { left: 100%; } }

/* ── Empty state ── */
.empty-state {
  text-align: center;
  padding: 48px 20px;
  color: var(--text-muted);
}
.empty-state p { font-size: 14px; margin-top: 8px; }

/* ── Lots sub-table ── */
.lots-section {
  margin-top: 24px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.lots-header {
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
}
.lots-header h4 { font-size: 14px; font-weight: 600; }

/* Movement type indicator */
.mvt-type { display: flex; align-items: center; gap: 6px; }
.mvt-type.in { color: var(--accent); }
.mvt-type.out { color: var(--danger); }

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
`;

// ─── Notification System ─────────────────────────────────────────────
function NotifProvider({ children }: { children: React.ReactNode }) {
  const [notifs, setNotifs] = useState<any[]>([]);
  const notifCountRef = useRef(0);
  const add = useCallback((msg: any, type: string = "success") => {
    const id = ++notifCountRef.current;
    setNotifs((n) => [...n, { id, msg, type }]);
    setTimeout(() => setNotifs((n) => n.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <NotifContext.Provider value={add}>
      {children}
      <div className="notif-container">
        {notifs.map((n) => (
          <div key={n.id} className={`notif ${n.type}`}>{n.msg}</div>
        ))}
      </div>
    </NotifContext.Provider>
  );
}

// ─── Modal Component ─────────────────────────────────────────────────
function Modal({ title, onClose, children, footer }: { title: any; onClose: any; children: any; footer?: any }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose}>{icons.close}</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Access Denied Component ─────────────────────────────────────────
function AccessDenied() {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
      <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>Accès refusé</div>
      <div>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</div>
    </div>
  );
}

// ─── Login Page ──────────────────────────────────────────────────────
function LoginPage() {
  const auth = useContext(AuthContext)!;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await auth.login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Identifiants incorrects");
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-bg-grid" />
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-icon">{icons.flask}</span>
          <h1>NGStock</h1>
        </div>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 8, justifyContent: "center" }} disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────
function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [recentMvts, setRecentMvts] = useState<any[]>([]);
  const notify = useContext(NotifContext);
  const auth = useContext(AuthContext);
  const userRole = auth?.user?.role || "viewer";
  const canDelete = PermissionService.canDeleteMovement(auth?.user?.role as any);

  useEffect(() => {
    (async () => {
      try {
        const [products, suppliers, movements] = await Promise.all([
          api.get("/products/?page=1&size=10000"),
          api.get("/suppliers/?page=1&size=10000"),
          api.get("/movements/?page=1&size=5"),
        ]);
        const prodList = products.items || products || [];
        const suppList = suppliers.items || suppliers || [];
        const mvtList = movements.items || movements || [];
        const lowStock = prodList.filter((p: Product) => (p.current_stock ?? p.stock ?? 0) <= (p.minimum_stock ?? p.threshold ?? 10)).length;
        setStats({ products: prodList.length, suppliers: suppList.length, movements: mvtList.length, lowStock });
        setRecentMvts(mvtList.slice(0, 5));
      } catch (e: unknown) { notify?.("Erreur chargement dashboard", "error"); }
    })();
  }, []);

  const handleDeleteMovement = async (movementId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce mouvement ?")) return;
    try {
      await api.del(`/movements/${movementId}`);
      notify?.("Mouvement supprimé");
      setRecentMvts(recentMvts.filter(m => m.id !== movementId));
    } catch (e: any) { notify?.(e?.message || "Erreur suppression", "error"); }
  };

  if (!stats) return <div className="loading-bar" />;

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Produits</div>
          <div className="stat-value">{stats.products}</div>
          <div className="stat-sub">produits référencés</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Fournisseurs</div>
          <div className="stat-value">{stats.suppliers}</div>
          <div className="stat-sub">partenaires actifs</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Mouvements</div>
          <div className="stat-value">{stats.movements}</div>
          <div className="stat-sub">derniers mouvements</div>
        </div>
        <div className="stat-card" style={stats.lowStock > 0 ? { borderColor: "var(--warning)" } : {}}>
          <div className="stat-label">Stock faible</div>
          <div className="stat-value" style={stats.lowStock > 0 ? { color: "var(--warning)" } : {}}>{stats.lowStock}</div>
          <div className="stat-sub">produits à réapprovisionner</div>
        </div>
      </div>
      <div className="table-container">
        <div className="table-toolbar">
          <span style={{ fontWeight: 600, fontSize: 14 }}>Derniers mouvements</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Produit</th>
              <th>Quantité</th>
              <th>Date</th>
              {userRole !== "viewer" && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {recentMvts.length === 0 ? (
              <tr><td colSpan={5}><div className="empty-state"><p>Aucun mouvement récent</p></div></td></tr>
            ) : recentMvts.map((m, i) => (
              <tr key={i}>
                <td>
                  <span className={`mvt-type ${m.movement_type === "entry" || m.type === "entry" || m.type === "in" ? "in" : "out"}`}>
                    {m.movement_type === "entry" || m.type === "entry" || m.type === "in" ? icons.arrowIn : icons.arrowOut}
                    {m.movement_type === "entry" || m.type === "entry" || m.type === "in" ? "Entrée" : "Sortie"}
                  </span>
                </td>
                <td className="cell-main">{m.product_name || m.product?.name || `#${m.product_id}`}</td>
                <td><span className="badge badge-info">{m.quantity}</span></td>
                <td style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  {m.created_at ? new Date(m.created_at).toLocaleDateString("fr-FR") : "—"}
                </td>
                {userRole !== "viewer" && (
                  <td>
                    <div className="action-cell">
                      {canDelete && (
                        <button className="btn-icon" title="Supprimer" onClick={() => handleDeleteMovement(m.id)}>{icons.trash}</button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Products Page ───────────────────────────────────────────────────
function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ name: "", reference: "", description: "", minimum_stock: "0", alert_stock: "0", supplier_id: "", location_id: "", category_id: "", lots: [] });
  const [lotForm, setLotForm] = useState<any>({ lot_number: "", quantity: "", expiry_date: "", notes: "" });
  const [lotModalMode, setLotModalMode] = useState<"create" | "edit">("create");
  const notify = useContext(NotifContext);
  const auth = useContext(AuthContext);

  const canEdit = PermissionService.canUpdateProduct(auth?.user?.role as any);
  const canDelete = PermissionService.canDeleteProduct(auth?.user?.role as any);
  const canCreate = PermissionService.canCreateProduct(auth?.user?.role as any);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.get("/products/?size=10000&page=1");
      setProducts(data.items || data || []);
    } catch { notify?.("Erreur chargement produits", "error"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const loadRelatedData = async () => {
    try {
      const [suppData, locData, catData] = await Promise.all([
        api.get("/suppliers/?size=10000&page=1").catch(() => []),
        api.get("/locations/?skip=0&limit=10000").catch(() => []),
        api.get("/categories/?skip=0&limit=10000").catch(() => []),
      ]);
      const supps = suppData.items || suppData || [];
      const locs = locData.items || locData || [];
      const cats = catData.items || catData || [];
      setSuppliers(supps);
      setLocations(locs);
      setCategories(cats);
      return { supps, locs, cats };
    } catch (e: unknown) {
      console.error("Erreur chargement données associées", e);
      return { supps: [], locs: [], cats: [] };
    }
  };

  const filtered = products.filter((p: Product) =>
    (p.name + (p.code || "")).toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = async () => {
    await loadRelatedData();
    setForm({ name: "", reference: "", description: "", minimum_stock: "0", alert_stock: "0", supplier_id: "", location_id: "", category_id: "", lots: [] });
    setModal("create");
  };

  const openEdit = async (p: Product) => {
    setSelected(p);
    await loadRelatedData();
    setForm({
      name: p.name || "",
      reference: (p as any).reference || "",
      description: (p as any).description || "",
      minimum_stock: String(p.minimum_stock ?? 0),
      alert_stock: String(p.alert_stock ?? 0),
      supplier_id: p.supplier_id != null ? String(p.supplier_id) : "",
      location_id: p.location_id != null ? String(p.location_id) : "",
      category_id: p.category_id != null ? String(p.category_id) : "",
      lots: (p as any).lots || [],
    });
    setModal("edit");
  };

  const openDetails = async (p: Product) => {
    try {
      const data = await api.get(`/products/${p.id}`);
      setSelected(data);
      setModal("details");
    } catch { notify?.("Erreur chargement détails", "error"); }
  };

  const handleSave = async () => {
    try {
      if (!form.reference || !form.reference.trim()) {
        notify?.("La référence du produit est obligatoire", "error");
        return;
      }
      if (!form.name || !form.name.trim()) {
        notify?.("Le nom du produit est obligatoire", "error");
        return;
      }

      const payload: any = {
        name: form.name,
        reference: form.reference,
        description: form.description,
        minimum_stock: parseInt(form.minimum_stock) || 0,
        alert_stock: parseInt(form.alert_stock) || 0,
        supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null,
        location_id: form.location_id ? parseInt(form.location_id) : null,
        category_id: form.category_id ? parseInt(form.category_id) : null,
      };

      if (modal === "create") {
        payload.lots = (form.lots || []).map((lot: any) => ({
          lot_number: lot.lot_number,
          quantity: parseInt(lot.quantity) || 0,
          expiry_date: lot.expiry_date || null,
          notes: lot.notes || null,
        }));
        await api.post("/products/", payload);
        notify?.("Produit créé");
      } else {
        await api.patch(`/products/${selected.id}`, payload);

        const currentLotIds = new Set((form.lots || []).filter((l: any) => l.id).map((l: any) => l.id));
        const originalLots = (selected as any).lots || [];
        for (const lot of originalLots) {
          if (!currentLotIds.has(lot.id)) {
            await api.del(`/products/${selected.id}/lots/${lot.id}`);
          }
        }

        const newLots = (form.lots || []).filter((lot: any) => !lot.id);
        for (const lot of newLots) {
          await api.post(`/products/${selected.id}/lots`, {
            lot_number: lot.lot_number,
            quantity: parseInt(lot.quantity) || 0,
            expiry_date: lot.expiry_date || null,
            notes: lot.notes || null,
          });
        }

        notify?.("Produit modifié");
      }

      setModal(null);
      load();
    } catch (e: unknown) { notify?.(e instanceof Error ? e.message : "Erreur", "error"); }
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Archiver "${p.name}" ?`)) return;
    try {
      await api.del(`/products/${p.id}`);
      notify?.("Produit archivé");
      load();
    } catch (e: unknown) { notify?.(e instanceof Error ? e.message : "Erreur", "error"); }
  };

  const addLotToForm = () => {
    const newLot = {
      lot_number: lotForm.lot_number,
      quantity: parseInt(lotForm.quantity) || 0,
      expiry_date: lotForm.expiry_date || null,
      notes: lotForm.notes || null,
    };
    setForm({ ...form, lots: [...(form.lots || []), newLot] });
    setLotForm({ lot_number: "", quantity: "", expiry_date: "", notes: "" });
    setLotModalMode("create");
  };

  const removeLotFromForm = (index: number) => {
    setForm({ ...form, lots: (form.lots || []).filter((_: any, i: number) => i !== index) });
  };

  return (
    <>
      <div className="table-container">
        <div className="table-toolbar">
          <div className="search-input-wrap">
            {icons.search}
            <input placeholder="Rechercher un produit…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ flex: 1 }} />
          {canCreate && <button className="btn btn-primary btn-sm" onClick={openCreate}>{icons.plus} Nouveau produit</button>}
        </div>
        {loading ? <div className="loading-bar" /> : (
          <table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Nom</th>
                <th>Stock Total</th>
                <th>Seuil min</th>
                <th>Lots</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><p>Aucun produit trouvé</p></div></td></tr>
              ) : filtered.map((p: Product) => {
                const stock = p.current_stock ?? 0;
                const low = stock <= (p.minimum_stock ?? 0);
                const lotCount = (p as any).lots?.length ?? 0;
                return (
                  <tr key={p.id}>
                    <td><span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{(p as any).reference || "—"}</span></td>
                    <td className="cell-main">{p.name}</td>
                    <td><span className={`badge ${low ? "badge-danger" : "badge-accent"}`}>{stock}</span></td>
                    <td>{p.minimum_stock ?? "—"}</td>
                    <td><span className="badge badge-muted">{lotCount}</span></td>
                    <td>
                      <div className="action-cell">
                        <button className="btn-icon" title="Détails" onClick={() => openDetails(p)}>ℹ</button>
                        {canEdit && <button className="btn-icon" title="Lots" onClick={() => openEdit(p)}>{icons.lot}</button>}
                        {canEdit && <button className="btn-icon" title="Modifier" onClick={() => openEdit(p)}>{icons.edit}</button>}
                        {canDelete && <button className="btn-icon" title="Archiver" onClick={() => handleDelete(p)}>{icons.trash}</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {(modal === "create" || modal === "edit") && (
        <Modal title={modal === "create" ? "Nouveau produit" : "Modifier produit"} onClose={() => setModal(null)} footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
          </>
        }>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Référence * (unique)</label>
              <input className="form-input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="REF-001" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Seuil minimum</label>
              <input className="form-input" type="number" value={form.minimum_stock} onChange={(e) => setForm({ ...form, minimum_stock: +e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Seuil alerte</label>
              <input className="form-input" type="number" value={form.alert_stock} onChange={(e) => setForm({ ...form, alert_stock: +e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fournisseur</label>
              <select className="form-input form-select" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
                <option value="">Aucun</option>
                {suppliers.map((s: Supplier) => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Localisation</label>
              <select className="form-input form-select" value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })}>
                <option value="">Aucune</option>
                {locations.map((l: Location) => (
                  <option key={l.id} value={String(l.id)}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Catégorie</label>
              <select className="form-input form-select" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Aucune</option>
                {categories.map((c: Category) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Gestion des lots */}
          <div style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600 }}>Lots</h4>
              <button className="btn btn-primary btn-sm" onClick={() => setLotModalMode("create")}>Ajouter un lot</button>
            </div>

            {lotModalMode === "create" && (
              <div style={{ background: "var(--bg-tertiary)", padding: 12, borderRadius: "var(--radius)", marginBottom: 12 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">N° lot*</label>
                    <input className="form-input" placeholder="LOT-001" value={lotForm.lot_number} onChange={(e) => setLotForm({ ...lotForm, lot_number: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantité*</label>
                    <input className="form-input" type="number" min="0" placeholder="10" value={lotForm.quantity} onChange={(e) => setLotForm({ ...lotForm, quantity: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date d'expiration</label>
                    <input className="form-input" type="date" value={lotForm.expiry_date} onChange={(e) => setLotForm({ ...lotForm, expiry_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <input className="form-input" placeholder="Commentaires…" value={lotForm.notes} onChange={(e) => setLotForm({ ...lotForm, notes: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setLotModalMode("create"); setLotForm({ lot_number: "", quantity: "", expiry_date: "", notes: "" }); }}>Annuler</button>
                  <button className="btn btn-primary btn-sm" onClick={addLotToForm}>Ajouter</button>
                </div>
              </div>
            )}

            {form.lots && form.lots.length > 0 ? (
              <div style={{ marginTop: 12 }}>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "8px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>N° Lot</th>
                      <th style={{ padding: "8px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>Qty</th>
                      <th style={{ padding: "8px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>Expiration</th>
                      <th style={{ padding: "8px", textAlign: "center", color: "var(--text-muted)", fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.lots.map((lot: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px", color: "var(--text-primary)" }}>{lot.lot_number}</td>
                        <td style={{ padding: "8px", color: "var(--text-primary)" }}>{lot.quantity}</td>
                        <td style={{ padding: "8px", color: "var(--text-muted)", fontSize: 12 }}>{lot.expiry_date || "—"}</td>
                        <td style={{ padding: "8px", textAlign: "center" }}>
                          <button className="btn-icon" onClick={() => removeLotFromForm(idx)}>
                            {icons.trash}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: 13 }}>
                Aucun lot. Ajoutez un lot pour démarrer →
              </div>
            )}
          </div>
        </Modal>
      )}

      {modal === "details" && selected && (
        <Modal title={`Détails — ${selected.name}`} onClose={() => setModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Référence</label>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{selected.reference || "—"}</div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Stock Total</label>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>{selected.current_stock ?? 0}</div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Seuil Min</label>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>{selected.minimum_stock ?? 0}</div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Seuil Alerte</label>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>{selected.alert_stock ?? 0}</div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Fournisseur</label>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>{selected.supplier?.name || "—"}</div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Localisation</label>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>{selected.location?.name || "—"}</div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Catégorie</label>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>{selected.category?.name || "—"}</div>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Description</label>
            <div style={{ fontSize: 14, color: "var(--text-primary)", marginTop: 6 }}>{selected.description || "—"}</div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Suppliers Page ──────────────────────────────────────────────────
// FIX : tous les hooks sont déclarés AVANT tout return conditionnel
function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [modal, setModal] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: "", contact: "", email: "", phone: "", address: "" });
  const notify = useContext(NotifContext);
  const auth = useContext(AuthContext);
  const userRole = auth?.user?.role || "viewer";

  // Admin et technicien peuvent consulter ; seul l'admin peut agir
  const canList = userRole === "admin" || userRole === "technician";
  const canCreate = PermissionService.canCreateSupplier(auth?.user?.role as any);
  const canUpdate = PermissionService.canUpdateSupplier(auth?.user?.role as any);
  const canDelete = PermissionService.canDeleteSupplier(auth?.user?.role as any);

  // FIX : load et useEffect déclarés AVANT le return conditionnel
  const load = async () => {
    try {
      setLoading(true);
      const data = await api.get("/suppliers/");
      setSuppliers(data.items || data || []);
    } catch { notify?.("Erreur chargement fournisseurs", "error"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Accès refusé après tous les hooks
  if (!canList) return <AccessDenied />;

  const filtered = suppliers.filter((s) =>
    (s.name + (s.email || "")).toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setForm({ name: "", contact: "", email: "", phone: "", address: "" }); setModal("create"); };
  const openEdit = (s: any) => {
    setSelected(s);
    setForm({ name: s.name, contact: s.contact || "", email: s.email || "", phone: s.phone || "", address: s.address || "" });
    setModal("edit");
  };
  const handleSave = async () => {
    try {
      if (modal === "create") {
        await api.post("/suppliers/", form);
        notify?.("Fournisseur créé");
      } else {
        await api.patch(`/suppliers/${selected.id}`, form);
        notify?.("Fournisseur modifié");
      }
      setModal(null);
      load();
    } catch (e: any) { notify?.(e?.message || "Erreur", "error"); }
  };
  const handleDelete = async (s: any) => {
    if (!confirm(`Supprimer "${s.name}" ?`)) return;
    try { await api.del(`/suppliers/${s.id}`); notify?.("Fournisseur supprimé"); load(); }
    catch (e: any) { notify?.(e?.message || "Erreur", "error"); }
  };

  return (
    <>
      <div className="table-container">
        <div className="table-toolbar">
          <div className="search-input-wrap">
            {icons.search}
            <input placeholder="Rechercher un fournisseur…" value={search} onChange={(e: any) => setSearch(e.target.value)} />
          </div>
          <div style={{ flex: 1 }} />
          {/* Bouton création uniquement pour les admins */}
          {canCreate && <button className="btn btn-primary btn-sm" onClick={openCreate}>{icons.plus} Nouveau fournisseur</button>}
        </div>
        {loading ? <div className="loading-bar" /> : (
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Téléphone</th>
                {/* Colonne Actions uniquement pour les admins, comme catégories/localisations */}
                {userRole === "admin" && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={userRole === "admin" ? 5 : 4}><div className="empty-state"><p>Aucun fournisseur</p></div></td></tr>
              ) : filtered.map((s: any) => (
                <tr key={s.id}>
                  <td className="cell-main">{s.name}</td>
                  <td>{s.contact || "—"}</td>
                  <td style={{ fontSize: 13 }}>{s.email || "—"}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{s.phone || "—"}</td>
                  {userRole === "admin" && (
                    <td>
                      <div className="action-cell">
                        {canUpdate && <button className="btn-icon" onClick={() => openEdit(s)}>{icons.edit}</button>}
                        {canDelete && <button className="btn-icon" onClick={() => handleDelete(s)}>{icons.trash}</button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(modal === "create" || modal === "edit") && (
        <Modal title={modal === "create" ? "Nouveau fournisseur" : "Modifier fournisseur"} onClose={() => setModal(null)} footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
          </>
        }>
          <div className="form-group">
            <label className="form-label">Nom *</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Contact</label>
              <input className="form-input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Téléphone</label>
              <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Adresse</label>
            <input className="form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Movements Page ──────────────────────────────────────────────────
function MovementsPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(30);
  const [modal, setModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [searchProduct, setSearchProduct] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ product_id: "", movement_type: "entry", quantity: "", lot_id: "", reason: "", reference_document: "", created_at: "" });
  const [productLots, setProductLots] = useState<any[]>([]);
  const [showNewLotForm, setShowNewLotForm] = useState(false);
  const [newLotForm, setNewLotForm] = useState<any>({ lot_number: "", quantity: "", expiry_date: "", notes: "" });
  const [creatingLot, setCreatingLot] = useState(false);
  const notify = useContext(NotifContext);
  const auth = useContext(AuthContext);
  const userRole = auth?.user?.role || "viewer";
  const canDelete = PermissionService.canDeleteMovement(auth?.user?.role as any);

  const load = async (pageNum = 1) => {
    try {
      setLoading(true);
      const data = await api.get(`/movements/?page=${pageNum}&size=${pageSize}`);
      setMovements(data.items || []);
      setTotal(data.total || 0);
      setPage(pageNum);
    } catch { notify?.("Erreur chargement mouvements", "error"); }
    setLoading(false);
  };
  useEffect(() => { load(1); }, []);

  const openCreate = async () => {
    try {
      const data = await api.get("/products/?page=1&size=10000&is_active=true");
      setProducts(data.items || data || []);
      setFilteredProducts(data.items || data || []);
    } catch { setProducts([]); setFilteredProducts([]); }
    setSearchProduct("");
    setProductLots([]);
    setShowNewLotForm(false);
    setNewLotForm({ lot_number: "", quantity: "", expiry_date: "", notes: "" });
    setForm({ product_id: "", movement_type: "entry", quantity: "", lot_id: "", reason: "", reference_document: "", created_at: "" });
    setModal(true);
  };

  const handleDeleteMovement = async (movementId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce mouvement ?")) return;
    try {
      await api.del(`/movements/${movementId}`);
      notify?.("Mouvement supprimé");
      load(page);
    } catch (e: any) { notify?.(e?.message || "Erreur suppression", "error"); }
  };

  const handleCreateLot = async () => {
    try {
      if (!newLotForm.lot_number || !newLotForm.lot_number.trim()) {
        notify?.("Le numéro de lot est obligatoire", "error");
        return;
      }
      const quantity = parseInt(newLotForm.quantity);
      if (!quantity || quantity <= 0 || isNaN(quantity)) {
        notify?.("La quantité doit être supérieure à 0", "error");
        return;
      }
      setCreatingLot(true);
      const payload: any = {
        product_id: parseInt(form.product_id),
        lot_number: newLotForm.lot_number,
        quantity: quantity,
        expiry_date: newLotForm.expiry_date || null,
        notes: newLotForm.notes || null,
      };
      const newLot = await api.post("/products/lots/", payload);
      notify?.("Lot créé avec succès", "success");
      
      // Ajouter le lot à la liste
      setProductLots([...productLots, newLot]);
      
      // Sélectionner automatiquement le nouveau lot
      setForm({ ...form, lot_id: newLot.id });
      
      // Fermer le formulaire
      setShowNewLotForm(false);
      setNewLotForm({ lot_number: "", quantity: "", expiry_date: "", notes: "" });
      setCreatingLot(false);
    } catch (e: any) {
      setCreatingLot(false);
      notify?.(e?.message || "Erreur création lot", "error");
    }
  };

  const handleSave = async () => {
    try {
      const quantity = parseInt(form.quantity);
      if (!form.product_id || !quantity || quantity <= 0 || isNaN(quantity)) {
        notify?.("Veuillez remplir tous les champs obligatoires (quantité > 0)", "error");
        return;
      }
      if (!form.lot_id) {
        notify?.("Veuillez sélectionner un lot", "error");
        return;
      }
      const payload: any = {
        product_id: parseInt(form.product_id),
        lot_id: parseInt(form.lot_id),
        movement_type: form.movement_type,
        quantity: quantity,
        reason: form.reason || null,
        reference_document: form.reference_document || null,
      };
      // Si une date est saisie, l'ajouter au payload (sinon le backend utilisera la date actuelle)
      if (form.created_at && form.created_at.trim()) {
        // Convertir la date au format ISO avec heure actuelle
        payload.created_at = new Date(form.created_at).toISOString();
      }
      const result = await api.post("/movements/", payload);
      if (result || result === null) {
        notify?.("Mouvement enregistré", "success");
        setModal(false);
        await load();
      }
    } catch (e: any) {
      const errMsg = e?.message || "Erreur lors de l'enregistrement du mouvement";
      notify?.(errMsg, "error");
      console.error("Movement save error:", e);
    }
  };

  return (
    <>
      <div className="table-container">
        <div className="table-toolbar">
          <span style={{ fontWeight: 600, fontSize: 14 }}>Historique des mouvements</span>
          <div style={{ flex: 1 }} />
          {(userRole === "admin" || userRole === "technician") && (
            <button className="btn btn-primary btn-sm" onClick={openCreate}>{icons.plus} Nouveau mouvement</button>
          )}
        </div>
        {loading ? <div className="loading-bar" /> : (
          <>
            <table>
              <thead><tr><th>Type</th><th>Produit</th><th>Quantité</th><th>Utilisateur</th><th>Motif</th><th>Date</th>{userRole !== "viewer" && <th>Actions</th>}</tr></thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state"><p>Aucun mouvement</p></div></td></tr>
                ) : movements.map((m: any, i: number) => {
                  const isIn = m.movement_type === "entry" || m.type === "entry" || m.type === "in" || m.type === "IN";
                  return (
                    <tr key={i}>
                      <td>
                        <span className={`mvt-type ${isIn ? "in" : "out"}`}>
                          {isIn ? icons.arrowIn : icons.arrowOut}
                          {isIn ? "Entrée" : "Sortie"}
                        </span>
                      </td>
                      <td className="cell-main">{m.product_name || m.product?.name || `#${m.product_id}`}</td>
                      <td><span className={`badge ${isIn ? "badge-accent" : "badge-danger"}`}>{m.quantity}</span></td>
                      <td style={{ fontSize: 13 }}>{m.user_name || "—"}</td>
                      <td style={{ fontSize: 13 }}>{m.reason || "—"}</td>
                      <td style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        {m.created_at ? new Date(m.created_at).toLocaleString("fr-FR") : "—"}
                      </td>
                      {userRole !== "viewer" && (
                        <td>
                          <div className="action-cell">
                            {canDelete && (
                              <button className="btn-icon" title="Supprimer" onClick={() => handleDeleteMovement(m.id)}>{icons.trash}</button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {total > pageSize && (
              <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {(page - 1) * pageSize + 1} à {Math.min(page * pageSize, total)} sur {total}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => load(page - 1)} disabled={page === 1}>Précédent</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => load(page + 1)} disabled={page * pageSize >= total}>Suivant</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {modal && (
        <Modal title="Nouveau mouvement" onClose={() => setModal(false)} footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
          </>
        }>
          <div className="form-group">
            <label className="form-label">Produit *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Rechercher un produit…"
              value={searchProduct}
              onChange={(e) => {
                setSearchProduct(e.target.value);
                const s = e.target.value.toLowerCase().trim();
                if (!s) {
                  setFilteredProducts([]);
                  return;
                }
                setFilteredProducts(products.filter((p: any) => {
                  const searchIn = [
                    p.name || "",
                    p.reference || "",
                    p.code || "",
                    ((p.lots || []) as any[]).map((lot: any) => lot.lot_number || "").join(" "),
                  ].join(" ").toLowerCase();
                  return searchIn.includes(s);
                }));
              }}
            />
            {searchProduct && filteredProducts.length > 0 && (
              <div style={{ marginTop: 6, border: "1px solid var(--border)", borderRadius: "var(--radius)", maxHeight: 150, overflowY: "auto", background: "var(--bg-secondary)" }}>
                {filteredProducts.map((p: any) => (
                  <div
                    key={p.id}
                    onClick={async () => {
                      setForm({ ...form, product_id: p.id, lot_id: "" });
                      setSearchProduct(p.name);
                      setFilteredProducts([]);
                      try {
                        const d = await api.get(`/products/${p.id}`);
                        setProductLots(d.lots || []);
                      } catch { setProductLots([]); }
                    }}
                    style={{ padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)", fontSize: 13 }}
                    onMouseEnter={(e: any) => e.target.style.background = "var(--bg-hover)"}
                    onMouseLeave={(e: any) => e.target.style.background = "transparent"}
                  >
                    <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{p.name}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 11 }}>Ref: {p.reference || "—"} | Stock: {p.current_stock || 0}</div>
                  </div>
                ))}
              </div>
            )}
            {searchProduct && filteredProducts.length === 0 && (
              <div style={{ marginTop: 6, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 13, color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
                Aucun produit trouvé
              </div>
            )}
            {form.movement_type === "entry" && form.product_id && (
              <div style={{ marginTop: 10 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowNewLotForm(!showNewLotForm)} style={{ width: "100%" }}>
                  {icons.plus} {showNewLotForm ? "Annuler" : "Ajouter un nouveau lot"}
                </button>
              </div>
            )}
          </div>
          {showNewLotForm && form.movement_type === "entry" && form.product_id && (
            <div style={{ padding: "16px", border: "2px solid var(--accent)", borderRadius: "var(--radius)", background: "rgba(88, 166, 255, 0.05)", marginBottom: 16 }}>
              <div style={{ fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>➕ Créer un nouveau lot</div>
              <div className="form-group">
                <label className="form-label">Numéro de lot *</label>
                <input className="form-input" type="text" placeholder="LOT-2024-001" value={newLotForm.lot_number} onChange={(e) => setNewLotForm({ ...newLotForm, lot_number: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantité *</label>
                  <input className="form-input" type="number" min="1" placeholder="100" value={newLotForm.quantity} onChange={(e) => setNewLotForm({ ...newLotForm, quantity: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Date d'expiration</label>
                  <input className="form-input" type="date" value={newLotForm.expiry_date} onChange={(e) => setNewLotForm({ ...newLotForm, expiry_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input className="form-input" type="text" placeholder="Observations ou remarques…" value={newLotForm.notes} onChange={(e) => setNewLotForm({ ...newLotForm, notes: e.target.value })} />
              </div>
              <button className="btn btn-accent" onClick={handleCreateLot} disabled={creatingLot} style={{ width: "100%" }}>
                {creatingLot ? "Création en cours..." : "Créer le lot"}
              </button>
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Type *</label>
              <select className="form-input form-select" value={form.movement_type} onChange={(e) => setForm({ ...form, movement_type: e.target.value })}>
                <option value="entry">Entrée</option>
                <option value="exit">Sortie</option>
                <option value="adjustment">Ajustement</option>
                <option value="loss">Perte</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantité *</label>
              <input className="form-input" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Lot *</label>
            <select className="form-input form-select" value={form.lot_id} onChange={(e) => setForm({ ...form, lot_id: e.target.value })} disabled={!form.product_id}>
              <option value="">{form.product_id ? "Sélectionner un lot" : "Choisir un produit d'abord"}</option>
              {productLots.map((lot: any) => (
                <option key={lot.id} value={lot.id}>
                  {lot.lot_number} — Stock: {lot.quantity}{lot.expiry_date ? ` | Exp: ${lot.expiry_date}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Motif</label>
            <input className="form-input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Réception commande, utilisation labo…" />
          </div>
          <div className="form-group">
            <label className="form-label">Document référence</label>
            <input className="form-input" value={form.reference_document} onChange={(e) => setForm({ ...form, reference_document: e.target.value })} placeholder="N° commande, bon de sortie…" />
          </div>
          <div className="form-group">
            <label className="form-label">Date du mouvement (optionnel)</label>
            <input className="form-input" type="date" value={form.created_at} onChange={(e) => setForm({ ...form, created_at: e.target.value })} />
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Si vide, la date d'aujourd'hui sera utilisée</div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Users Page ──────────────────────────────────────────────────────
// FIX : tous les hooks sont déclarés AVANT tout return conditionnel
function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: "", email: "", password: "", role: "viewer" });
  const notify = useContext(NotifContext);
  const auth = useContext(AuthContext);

  const canList = PermissionService.canListUsers(auth?.user?.role as any);

  // FIX : load et useEffect déclarés AVANT le return conditionnel
  const load = async () => {
    try {
      setLoading(true);
      const data = await api.get("/users/");
      setUsers(data.items || data || []);
    } catch { notify?.("Erreur chargement utilisateurs", "error"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Accès refusé après tous les hooks
  if (!canList) return <AccessDenied />;

  const openCreate = () => {
    setForm({ name: "", email: "", password: "", role: "viewer" });
    setModal("create");
  };
  const openEdit = (u: any) => {
    setSelected(u);
    setForm({ name: u.name || "", email: u.email || "", password: "", role: u.role || "viewer" });
    setModal("edit");
  };
  const handleSave = async () => {
    try {
      if (modal === "create") {
        await api.post("/users/", form);
        notify?.("Utilisateur créé");
      } else {
        const updatePayload = { name: form.name, role: form.role };
        await api.patch(`/users/${selected.id}`, updatePayload);
        notify?.("Utilisateur modifié");
      }
      setModal(null);
      load();
    } catch (e: any) { notify?.(e?.message || "Erreur", "error"); }
  };
  const handleDelete = async (u: any) => {
    if (!confirm(`Supprimer définitivement "${u.name}" ? Cette action est irréversible.`)) return;
    try { await api.del(`/users/${u.id}`); notify?.("Utilisateur supprimé"); load(); }
    catch (e: any) { notify?.(e?.message || "Erreur", "error"); }
  };
  const handleToggle = async (u: any) => {
    const action = u.is_active ? "désactiver" : "activer";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} "${u.name}" ?`)) return;
    try {
      await api.post(`/users/${u.id}/toggle-status`, {});
      notify?.(`Utilisateur ${action}`);
      load();
    } catch (e: any) { notify?.(e?.message || "Erreur", "error"); }
  };

  const roleLabel = (r: any) => {
    const m: Record<string, string> = { admin: "Admin", technician: "Technicien", viewer: "Lecteur" };
    return m[r] || r;
  };
  const roleBadge = (r: any) => {
    const m: Record<string, string> = { admin: "badge-warning", technician: "badge-info", viewer: "badge-muted" };
    return m[r] || "badge-muted";
  };

  return (
    <>
      <div className="table-container">
        <div className="table-toolbar">
          <span style={{ fontWeight: 600, fontSize: 14 }}>Gestion des utilisateurs</span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary btn-sm" onClick={openCreate}>{icons.plus} Nouvel utilisateur</button>
        </div>
        {loading ? <div className="loading-bar" /> : (
          <table>
            <thead><tr><th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state"><p>Aucun utilisateur</p></div></td></tr>
              ) : users.map((u: any) => (
                <tr key={u.id}>
                  <td>
                    <div className="cell-main">{u.name}</div>
                    <div className="cell-sub">{u.email}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{u.email || "—"}</td>
                  <td><span className={`badge ${roleBadge(u.role)}`}>{roleLabel(u.role)}</span></td>
                  <td><span className={`badge ${u.is_active !== false ? "badge-accent" : "badge-danger"}`}>{u.is_active !== false ? "Actif" : "Inactif"}</span></td>
                  <td>
                    <div className="action-cell">
                      <button className="btn-icon" onClick={() => openEdit(u)} title="Modifier">{icons.edit}</button>
                      <button className="btn-icon" onClick={() => handleToggle(u)} title={u.is_active !== false ? "Désactiver" : "Activer"} style={{ opacity: u.is_active !== false ? 1 : 0.6 }}>
                        {u.is_active !== false ? "🔒" : "🔓"}
                      </button>
                      <button className="btn-icon" onClick={() => handleDelete(u)} title="Supprimer">{icons.trash}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(modal === "create" || modal === "edit") && (
        <Modal title={modal === "create" ? "Nouvel utilisateur" : "Modifier utilisateur"} onClose={() => setModal(null)} footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
          </>
        }>
          <div className="form-group">
            <label className="form-label">Nom complet *</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Rôle</label>
              <select className="form-input form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="viewer">Lecteur</option>
                <option value="technician">Technicien</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{modal === "edit" ? "Nouveau mot de passe" : "Mot de passe *"}</label>
              <input className="form-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={modal === "edit" ? "Laisser vide si inchangé" : ""} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Categories Page ─────────────────────────────────────────────────
function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: "", description: "", color: "#2DD4A8" });
  const notify = useContext(NotifContext);
  const auth = useContext(AuthContext);
  const userRole = auth?.user?.role || "viewer";

  const canCreate = PermissionService.canCreateCategory(auth?.user?.role as any);
  const canUpdate = PermissionService.canUpdateCategory(auth?.user?.role as any);
  const canDelete = PermissionService.canDeleteCategory(auth?.user?.role as any);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.get("/categories/");
      setCategories(data || []);
    } catch { notify?.("Erreur chargement catégories", "error"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = categories.filter((c: any) => (c.name || "").toLowerCase().includes(search.toLowerCase()));

  const handleSave = async () => {
    try {
      if (modal === "create") {
        await api.post("/categories/", form);
        notify?.("Catégorie créée");
      } else {
        await api.patch(`/categories/${selected.id}`, form);
        notify?.("Catégorie modifiée");
      }
      setModal(null);
      load();
    } catch (e: any) { notify?.(e?.message || "Erreur", "error"); }
  };

  const handleDelete = async (c: any) => {
    if (!confirm(`Supprimer "${c.name}" ?`)) return;
    try {
      const productsData = await api.get(`/products/?category_id=${c.id}&page=1&size=1`).catch(() => null);
      const linkedCount = productsData?.total ?? (productsData?.items?.length ?? 0);
      if (linkedCount > 0) {
        notify?.(
          `Impossible de supprimer "${c.name}" : ${linkedCount} produit(s) y sont associés. Désassociez-les d'abord.`,
          "error"
        );
        return;
      }
      await api.del(`/categories/${c.id}`);
      notify?.("Catégorie supprimée");
      load();
    } catch (e: any) { notify?.(e?.message || "Erreur", "error"); }
  };

  return (
    <>
      <div className="table-container">
        <div className="table-toolbar">
          <div className="search-input-wrap">
            {icons.search}
            <input placeholder="Rechercher une catégorie…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ flex: 1 }} />
          {canCreate && <button className="btn btn-primary btn-sm" onClick={() => {
            setForm({ name: "", description: "", color: "#2DD4A8" });
            setModal("create");
          }}>{icons.plus} Nouvelle catégorie</button>}
        </div>
        {loading ? <div className="loading-bar" /> : (
          <table>
            <thead><tr><th>Couleur</th><th>Nom</th><th>Description</th>{userRole === "admin" && <th>Actions</th>}</tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4}><div className="empty-state"><p>Aucune catégorie trouvée</p></div></td></tr>
              ) : filtered.map((c: any) => (
                <tr key={c.id}>
                  <td><div style={{ width: 24, height: 24, borderRadius: "var(--radius)", background: c.color || "var(--bg-tertiary)" }} /></td>
                  <td className="cell-main">{c.name}</td>
                  <td style={{ fontSize: 13 }}>{c.description || "—"}</td>
                  {userRole === "admin" && (
                    <td>
                      <div className="action-cell">
                        {canUpdate && <button className="btn-icon" onClick={() => {
                          setSelected(c);
                          setForm({ name: c.name || "", description: c.description || "", color: c.color || "#2DD4A8" });
                          setModal("edit");
                        }}>{icons.edit}</button>}
                        {canDelete && <button className="btn-icon" onClick={() => handleDelete(c)}>{icons.trash}</button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal === "create" ? "Nouvelle catégorie" : "Modifier catégorie"} onClose={() => setModal(null)} footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
          </>
        }>
          <div className="form-group">
            <label className="form-label">Nom *</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Couleur</label>
            <input className="form-input" type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Locations Page ──────────────────────────────────────────────────
function LocationsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: "", description: "", temperature_controlled: false });
  const notify = useContext(NotifContext);
  const auth = useContext(AuthContext);
  const userRole = auth?.user?.role || "viewer";

  const canCreate = PermissionService.canCreateLocation(auth?.user?.role as any);
  const canUpdate = PermissionService.canUpdateLocation(auth?.user?.role as any);
  const canDelete = PermissionService.canDeleteLocation(auth?.user?.role as any);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.get("/locations/");
      setLocations(data || []);
    } catch { notify?.("Erreur chargement localisations", "error"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = locations.filter((l: any) => (l.name || "").toLowerCase().includes(search.toLowerCase()));

  const handleSave = async () => {
    try {
      if (modal === "create") {
        await api.post("/locations/", form);
        notify?.("Localisation créée");
      } else {
        await api.patch(`/locations/${selected.id}`, form);
        notify?.("Localisation modifiée");
      }
      setModal(null);
      load();
    } catch (e: any) { notify?.(e?.message || "Erreur", "error"); }
  };

  const handleDelete = async (l: any) => {
    if (!confirm(`Supprimer "${l.name}" ?`)) return;
    try {
      const productsData = await api.get(`/products/?location_id=${l.id}&page=1&size=1`).catch(() => null);
      const linkedCount = productsData?.total ?? (productsData?.items?.length ?? 0);
      if (linkedCount > 0) {
        notify?.(
          `Impossible de supprimer "${l.name}" : ${linkedCount} produit(s) y sont stockés. Déplacez-les d'abord.`,
          "error"
        );
        return;
      }
      await api.del(`/locations/${l.id}`);
      notify?.("Localisation supprimée");
      load();
    } catch (e: any) { notify?.(e?.message || "Erreur", "error"); }
  };

  return (
    <>
      <div className="table-container">
        <div className="table-toolbar">
          <div className="search-input-wrap">
            {icons.search}
            <input placeholder="Rechercher une localisation…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ flex: 1 }} />
          {canCreate && <button className="btn btn-primary btn-sm" onClick={() => {
            setForm({ name: "", description: "", temperature_controlled: false });
            setModal("create");
          }}>{icons.plus} Nouvelle localisation</button>}
        </div>
        {loading ? <div className="loading-bar" /> : (
          <table>
            <thead><tr><th>Nom</th><th>Description</th><th>Contrôle temp.</th>{userRole === "admin" && <th>Actions</th>}</tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4}><div className="empty-state"><p>Aucune localisation trouvée</p></div></td></tr>
              ) : filtered.map((l: any) => (
                <tr key={l.id}>
                  <td className="cell-main">{l.name}</td>
                  <td style={{ fontSize: 13 }}>{l.description || "—"}</td>
                  <td><span className={`badge ${l.temperature_controlled ? "badge-accent" : "badge-muted"}`}>{l.temperature_controlled ? "Oui" : "Non"}</span></td>
                  {userRole === "admin" && (
                    <td>
                      <div className="action-cell">
                        {canUpdate && <button className="btn-icon" onClick={() => {
                          setSelected(l);
                          setForm({ name: l.name || "", description: l.description || "", temperature_controlled: l.temperature_controlled || false });
                          setModal("edit");
                        }}>{icons.edit}</button>}
                        {canDelete && <button className="btn-icon" onClick={() => handleDelete(l)}>{icons.trash}</button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal === "create" ? "Nouvelle localisation" : "Modifier localisation"} onClose={() => setModal(null)} footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleSave}>Enregistrer</button>
          </>
        }>
          <div className="form-group">
            <label className="form-label">Nom *</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">
              <input type="checkbox" checked={form.temperature_controlled} onChange={(e) => setForm({ ...form, temperature_controlled: e.target.checked })} style={{ marginRight: 8 }} />
              Contrôle de température
            </label>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── App Shell ───────────────────────────────────────────────────────
const NAV = [
  { key: "dashboard",  label: "Tableau de bord", icon: icons.dashboard,  roles: ["admin", "technician", "viewer"] },
  { key: "products",   label: "Produits",         icon: icons.products,   roles: ["admin", "technician", "viewer"] },
  // FIX : technicien peut voir les fournisseurs (lecture seule)
  { key: "suppliers",  label: "Fournisseurs",     icon: icons.suppliers,  roles: ["admin", "technician"] },
  { key: "categories", label: "Catégories",       icon: icons.products,   roles: ["admin", "technician", "viewer"] },
  { key: "locations",  label: "Localisations",    icon: icons.products,   roles: ["admin", "technician", "viewer"] },
  { key: "movements",  label: "Mouvements",       icon: icons.movements,  roles: ["admin", "technician", "viewer"] },
  { key: "users",      label: "Utilisateurs",     icon: icons.users,      roles: ["admin"] },
];

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  dashboard:  { title: "Tableau de bord",         subtitle: "Vue d'ensemble du laboratoire" },
  products:   { title: "Produits",                subtitle: "Gestion des réactifs, consommables et équipements" },
  suppliers:  { title: "Fournisseurs",            subtitle: "Annuaire des fournisseurs" },
  categories: { title: "Catégories",              subtitle: "Gestion des catégories de produits" },
  locations:  { title: "Localisations",           subtitle: "Gestion des lieux de stockage" },
  movements:  { title: "Mouvements de stock",     subtitle: "Entrées et sorties de stock" },
  users:      { title: "Utilisateurs",            subtitle: "Gestion des accès" },
};

// ─── Export Button Component ────────────────────────────────────────
function ExportButton({ token }: { token: string }) {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const notify = useContext(NotifContext);

  const exportOptions = [
    { key: "all",       label: "📦 Tous les enregistrements (ZIP)" },
    { key: "products",  label: "Produits" },
    { key: "movements", label: "Mouvements de stock" },
    { key: "alerts",    label: "Alertes" },
    { key: "users",     label: "Utilisateurs" },
    { key: "suppliers", label: "Fournisseurs" },
    { key: "locations", label: "Localisations" },
    { key: "categories",label: "Catégories" },
    { key: "lots",      label: "Lots de produits" },
  ];

  const download = async (endpoint: string) => {
    try {
      setLoading(endpoint);
      const url = `${API_BASE}/export/csv/${endpoint}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Erreur lors de l'export");
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `labmanage_${endpoint}_${new Date().toISOString().split("T")[0]}.${endpoint === "all" ? "zip" : "csv"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      notify?.(`Export "${endpoint}" téléchargé`, "success");
      setShowMenu(false);
    } catch (error) {
      notify?.(error instanceof Error ? error.message : "Erreur d'export", "error");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={loading !== null}
        className="btn btn-primary"
        style={{ display: "flex", alignItems: "center", gap: "8px" }}
      >
        {icons.download}
        Exporter
      </button>

      {showMenu && (
        <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow)", zIndex: 1000, minWidth: "280px", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-tertiary)" }}>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Télécharger les données</div>
          </div>
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {exportOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => download(opt.key)}
                disabled={loading !== null}
                style={{ width: "100%", padding: "12px 16px", border: "none", backgroundColor: "transparent", color: loading === opt.key ? "var(--accent)" : "var(--text-primary)", cursor: loading ? "not-allowed" : "pointer", fontSize: "13px", textAlign: "left", transition: "all 0.15s ease", borderBottom: "1px solid var(--border)", opacity: loading && loading !== opt.key ? 0.5 : 1 }}
                onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--bg-hover)"; }}
                onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div style={{ padding: "8px 16px", backgroundColor: "var(--bg-tertiary)", borderTop: "1px solid var(--border)", fontSize: "11px", color: "var(--text-muted)" }}>
            Format CSV (ZIP pour tous les enregistrements)
          </div>
        </div>
      )}
    </div>
  );
}

function AppShell({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [page, setPage] = useState("dashboard");
  const meta = PAGE_META[page];
  const userRole = user?.role || "viewer";

  // FIX : filtrage de la nav basé sur le tableau roles de chaque entrée
  const filteredNav = NAV.filter((n) => n.roles.includes(userRole));

  // FIX : redirection uniquement si la page n'est pas autorisée pour ce rôle
  useEffect(() => {
    const allowed = NAV.find((n) => n.key === page);
    if (allowed && !allowed.roles.includes(userRole)) {
      setPage("dashboard");
    }
  }, [page, userRole]);

  return (
    <div className="lab-app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">{icons.flask}</span>
          <h1>NGStock</h1>
          <span className="version">v1.1</span>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {filteredNav.map((n) => (
            <div key={n.key} className={`nav-item ${page === n.key ? "active" : ""}`} onClick={() => setPage(n.key)}>
              {n.icon}
              {n.label}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={onLogout} title="Se déconnecter">
            <div className="user-avatar">{(user?.name || "U")[0].toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{user?.name || "Utilisateur"}</div>
              <div className="user-role">{user?.role || "user"}</div>
            </div>
            {icons.logout}
          </div>
        </div>
      </aside>
      <main className="main-content">
        <div className="page-header">
          <div>
            <div className="page-title">{meta.title}</div>
            <div className="page-subtitle">{meta.subtitle}</div>
          </div>
          {userRole === "admin" && (
            <ExportButton token={api.token || ""} />
          )}
        </div>
        <div className="page-body">
          {page === "dashboard"  && <DashboardPage />}
          {page === "products"   && <ProductsPage />}
          {page === "suppliers"  && <SuppliersPage />}
          {page === "categories" && <CategoriesPage />}
          {page === "locations"  && <LocationsPage />}
          {page === "movements"  && <MovementsPage />}
          {page === "users"      && <UsersPage />}
        </div>
      </main>
    </div>
  );
}

// ─── Root App with Auth ──────────────────────────────────────────────
export default function App() {
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
        <style>{CSS}</style>
        {user ? <AppShell user={user} onLogout={logout} /> : <LoginPage />}
      </NotifProvider>
    </AuthContext.Provider>
  );
}