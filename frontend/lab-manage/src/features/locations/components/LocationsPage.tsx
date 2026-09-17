"use client";

import { useState, useEffect, useContext } from "react";
import { PermissionService } from "@/lib/permissions";
import { api } from "@/lib/api-client";
import { AuthContext, NotifContext } from "@/lib/contexts";
import { icons } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";

export function LocationsPage() {
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
