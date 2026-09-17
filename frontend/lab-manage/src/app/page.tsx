"use client";

import { useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { api } from "@/lib/api-client";
import { AuthContext, NotifContext } from "@/lib/contexts";
import { icons } from "@/components/ui/icons";
import { SuppliersPage } from "@/features/suppliers/components/SuppliersPage";
import { CategoriesPage } from "@/features/categories/components/CategoriesPage";
import { LocationsPage } from "@/features/locations/components/LocationsPage";
import { UsersPage } from "@/features/users/components/UsersPage";
import { MovementsPage } from "@/features/movements/components/MovementsPage";
import { ProductsPage } from "@/features/products/components/ProductsPage";
import { DashboardPage } from "@/features/dashboard/components/DashboardPage";
import { ExportButton } from "@/features/export/components/ExportButton";
import { LoginPage } from "@/features/auth/components/LoginPage";

// ─── Styles ──────────────────────────────────────────────────────────
const CSS = `
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
        <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <style>{CSS}</style>
      </>
        {user ? <AppShell user={user} onLogout={logout} /> : <LoginPage />}
      </NotifProvider>
    </AuthContext.Provider>
  );
}