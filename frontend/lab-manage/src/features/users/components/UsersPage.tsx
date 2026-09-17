"use client";

import { useState, useEffect, useContext } from "react";
import { PermissionService } from "@/lib/permissions";
import { api } from "@/lib/api-client";
import { AuthContext, NotifContext } from "@/lib/contexts";
import { icons } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { AccessDenied } from "@/components/ui/AccessDenied";

// FIX : tous les hooks sont déclarés AVANT tout return conditionnel
export function UsersPage() {
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
