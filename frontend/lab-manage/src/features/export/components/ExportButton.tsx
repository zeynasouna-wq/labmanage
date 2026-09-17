"use client";

import { useState, useContext } from "react";
import { API_BASE } from "@/lib/api-client";
import { NotifContext } from "@/lib/contexts";
import { icons } from "@/components/ui/icons";

export function ExportButton({ token }: { token: string }) {
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
