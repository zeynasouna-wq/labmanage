"use client";

import { useState, useEffect, useCallback, useContext, useRef, ReactNode } from "react";
import { PermissionService } from "@/lib/permissions";
import { api, API_BASE } from "@/lib/api-client";
import { AuthContext, NotifContext } from "@/lib/contexts";
import { icons } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { SuppliersPage } from "@/features/suppliers/components/SuppliersPage";
import { CategoriesPage } from "@/features/categories/components/CategoriesPage";
import { LocationsPage } from "@/features/locations/components/LocationsPage";
import { UsersPage } from "@/features/users/components/UsersPage";
import { MovementsPage } from "@/features/movements/components/MovementsPage";

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
          expiry_date: lot.expiry_date && lot.expiry_date !== "" ? lot.expiry_date : null,
          notes: lot.notes && lot.notes !== "" ? lot.notes : null,
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
            expiry_date: lot.expiry_date && lot.expiry_date !== "" ? lot.expiry_date : null,
            notes: lot.notes && lot.notes !== "" ? lot.notes : null,
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