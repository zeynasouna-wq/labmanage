"use client";

import { useState, useEffect, useContext } from "react";
import { PermissionService } from "@/lib/permissions";
import { api } from "@/lib/api-client";
import { AuthContext, NotifContext } from "@/lib/contexts";
import { icons } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";

export function MovementsPage() {
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
  const todayStr = () => new Date().toISOString().split("T")[0];
  const emptyLotRow = () => ({ lot_number: "", quantity: "", expiry_date: "", notes: "", created_at: todayStr() });
  const [newLots, setNewLots] = useState<any[]>([emptyLotRow()]);
  const [creatingLot, setCreatingLot] = useState(false);
  const [productSelected, setProductSelected] = useState(false);
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
    setProductSelected(false);
    setProductLots([]);
    setShowNewLotForm(false);
    setNewLots([{ lot_number: "", quantity: "", expiry_date: "", notes: "", created_at: new Date().toISOString().split("T")[0] }]);
    setForm({ product_id: "", movement_type: "entry", quantity: "", lot_id: "", reason: "", reference_document: "", created_at: new Date().toISOString().split("T")[0] });
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

  const handleCreateLots = async () => {
    // Validate all rows
    for (let i = 0; i < newLots.length; i++) {
      const lot = newLots[i];
      if (!lot.lot_number || !lot.lot_number.trim()) {
        notify?.(`Lot ${i + 1} : le numéro de lot est obligatoire`, "error");
        return;
      }
      const qty = parseInt(lot.quantity);
      if (!qty || qty <= 0 || isNaN(qty)) {
        notify?.(`Lot ${i + 1} : la quantité doit être supérieure à 0`, "error");
        return;
      }
    }
    setCreatingLot(true);
    try {
      for (const lot of newLots) {
        const qty = parseInt(lot.quantity);
        // Create lot with quantity=0 to avoid double counting with entry movement
        const lotPayload: any = {
          lot_number: lot.lot_number.trim(),
          quantity: 0,
          expiry_date: lot.expiry_date && lot.expiry_date.trim() !== "" ? lot.expiry_date : null,
          notes: lot.notes && lot.notes.trim() !== "" ? lot.notes.trim() : null,
        };
        const newLot = await api.post(`/products/${parseInt(form.product_id)}/lots`, lotPayload);
        // Entry movement to set the stock
        const movementPayload: any = {
          product_id: parseInt(form.product_id),
          lot_id: newLot.id,
          movement_type: "entry",
          quantity: qty,
          reason: form.reason || null,
          reference_document: form.reference_document || null,
          // Use lot-level date if set, otherwise today
          created_at: lot.created_at && lot.created_at.trim() !== ""
            ? new Date(lot.created_at).toISOString()
            : new Date().toISOString(),
        };
        await api.post("/movements/", movementPayload);
      }
      notify?.(`${newLots.length} lot(s) créé(s) et mouvements enregistrés`, "success");
      setShowNewLotForm(false);
      setNewLots([{ lot_number: "", quantity: "", expiry_date: "", notes: "", created_at: new Date().toISOString().split("T")[0] }]);
      setCreatingLot(false);
      setModal(false);
      await load();
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
        // Toujours envoyer la date — pré-remplie avec aujourd'hui si non modifiée
        created_at: form.created_at && form.created_at.trim()
          ? new Date(form.created_at).toISOString()
          : new Date().toISOString(),
      };
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
                setProductSelected(false);
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
                      setProductSelected(true);
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
            {searchProduct && !productSelected && filteredProducts.length === 0 && (
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
            <div style={{ padding: "16px", border: "2px solid var(--accent)", borderRadius: "var(--radius)", background: "rgba(45, 212, 168, 0.04)", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontWeight: 600, color: "var(--accent)", fontSize: 14 }}>➕ Nouveaux lots</div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setNewLots([...newLots, { lot_number: "", quantity: "", expiry_date: "", notes: "", created_at: new Date().toISOString().split("T")[0] }])}
                  style={{ display: "flex", alignItems: "center", gap: 4 }}
                >
                  {icons.plus} Ajouter un lot
                </button>
              </div>
              {newLots.map((lot, idx) => (
                <div key={idx} style={{ marginBottom: 12, padding: "12px", background: "var(--bg-tertiary)", borderRadius: "var(--radius)", border: "1px solid var(--border)", position: "relative" }}>
                  {newLots.length > 1 && (
                    <button
                      onClick={() => setNewLots(newLots.filter((_, i) => i !== idx))}
                      style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: "var(--danger)", display: "flex" }}
                      title="Supprimer ce lot"
                    >
                      {icons.close}
                    </button>
                  )}
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>LOT {idx + 1}</div>
                  <div className="form-row" style={{ marginBottom: 8 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">N° de lot *</label>
                      <input className="form-input" type="text" placeholder="LOT-2024-001" value={lot.lot_number}
                        onChange={(e) => setNewLots(newLots.map((l, i) => i === idx ? { ...l, lot_number: e.target.value } : l))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Quantité *</label>
                      <input className="form-input" type="number" min="1" placeholder="100" value={lot.quantity}
                        onChange={(e) => setNewLots(newLots.map((l, i) => i === idx ? { ...l, quantity: e.target.value } : l))} />
                    </div>
                  </div>
                  <div className="form-row" style={{ marginBottom: 8 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Date d'expiration</label>
                      <input className="form-input" type="date" value={lot.expiry_date}
                        onChange={(e) => setNewLots(newLots.map((l, i) => i === idx ? { ...l, expiry_date: e.target.value } : l))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Date de réception</label>
                      <input className="form-input" type="date" value={lot.created_at}
                        onChange={(e) => setNewLots(newLots.map((l, i) => i === idx ? { ...l, created_at: e.target.value } : l))} />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Notes</label>
                    <input className="form-input" type="text" placeholder="Observations…" value={lot.notes}
                      onChange={(e) => setNewLots(newLots.map((l, i) => i === idx ? { ...l, notes: e.target.value } : l))} />
                  </div>
                </div>
              ))}
              <button className="btn btn-primary" onClick={handleCreateLots} disabled={creatingLot} style={{ width: "100%" }}>
                {creatingLot ? "Création en cours..." : `Créer ${newLots.length} lot${newLots.length > 1 ? "s" : ""}`}
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
            <label className="form-label">Date de réception *</label>
            <input className="form-input" type="date" value={form.created_at} onChange={(e) => setForm({ ...form, created_at: e.target.value })} />
          </div>
        </Modal>
      )}
    </>
  );
}
