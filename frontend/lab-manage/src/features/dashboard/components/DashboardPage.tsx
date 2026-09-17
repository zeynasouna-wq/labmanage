"use client";

import { useState, useEffect, useContext } from "react";
import { PermissionService } from "@/lib/permissions";
import { api } from "@/lib/api-client";
import { AuthContext, NotifContext } from "@/lib/contexts";
import { icons } from "@/components/ui/icons";
import type { Product } from "@/features/products/types";

export function DashboardPage() {
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
