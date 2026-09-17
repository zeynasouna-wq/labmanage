"use client";

import { useState, useEffect, useContext } from "react";
import { PermissionService } from "@/lib/permissions";
import { api } from "@/lib/api-client";
import { AuthContext, NotifContext } from "@/lib/contexts";
import { icons } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";

export function CategoriesPage() {
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
