"use client";

import { useState, useEffect, useContext } from "react";
import { PermissionService } from "@/lib/permissions";
import { api } from "@/lib/api-client";
import { AuthContext, NotifContext } from "@/lib/contexts";
import { icons } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { AccessDenied } from "@/components/ui/AccessDenied";

// FIX : tous les hooks sont déclarés AVANT tout return conditionnel
export function SuppliersPage() {
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
