"use client";

import { useState, useEffect, useContext } from "react";
import { PermissionService } from "@/lib/permissions";
import { api } from "@/lib/api-client";
import { AuthContext, NotifContext } from "@/lib/contexts";
import { icons } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import type { Product, Supplier, Location, Category } from "@/features/products/types";

export function ProductsPage() {
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
