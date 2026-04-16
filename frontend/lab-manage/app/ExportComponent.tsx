/**
 * Export Component - Téléchargement des données en CSV
 * À intégrer dans page.tsx ou un dashboard admin
 */

"use client";
import { useState } from "react";

interface ExportButtonProps {
  token: string;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
  apiBase?: string;
}

const ExportOptions = {
  ALL: "all",
  PRODUCTS: "products",
  MOVEMENTS: "movements",
  ALERTS: "alerts",
  USERS: "users",
  SUPPLIERS: "suppliers",
  LOCATIONS: "locations",
  CATEGORIES: "categories",
  LOTS: "lots",
};

const ExportLabels: Record<string, string> = {
  all: "Tous les enregistrements (ZIP)",
  products: "Produits",
  movements: "Mouvements de stock (Historique)",
  alerts: "Alertes",
  users: "Utilisateurs",
  suppliers: "Fournisseurs",
  locations: "Localisations",
  categories: "Catégories",
  lots: "Lots de produits",
};

export default function ExportComponent({
  token,
  onSuccess,
  onError,
  apiBase = "https://labmanage.onrender.com",
}: ExportButtonProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const downloadFile = async (endpoint: string, filename: string) => {
    try {
      setLoading(endpoint);

      const url =
        endpoint === ExportOptions.ALL
          ? `${apiBase}/export/csv/all`
          : `${apiBase}/export/csv/${endpoint}`;

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `Erreur ${response.status}`);
      }

      // Créer un blob et télécharger
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download =
        filename || `export_${endpoint}_${new Date().toISOString().split("T")[0]}.${endpoint === ExportOptions.ALL ? "zip" : "csv"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      if (onSuccess) {
        onSuccess(`${filename} téléchargé avec succès`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      if (onError) {
        onError(message);
      }
      console.error("Erreur lors de l'export:", error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Bouton principal */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={loading !== null}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          backgroundColor: "#2DD4A8",
          color: "#0B0E13",
          border: "none",
          borderRadius: "6px",
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: "600",
          fontSize: "14px",
          opacity: loading ? 0.6 : 1,
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          if (!loading)
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "#24B890";
        }}
        onMouseLeave={(e) => {
          if (!loading)
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "#2DD4A8";
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {loading ? `Téléchargement (${loading})...` : "Exporter"}
      </button>

      {/* Menu déroulant */}
      {showMenu && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "8px",
            backgroundColor: "#111620",
            border: "1px solid #1E2738",
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            zIndex: 1000,
            minWidth: "280px",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #1E2738",
              backgroundColor: "#171D2A",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#5A6478",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Télécharger
            </div>
          </div>

          {/* Options */}
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {Object.entries(ExportLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  downloadFile(key, `labmanage_${key}.${key === "all" ? "zip" : "csv"}`);
                  setShowMenu(false);
                }}
                disabled={loading !== null}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "none",
                  backgroundColor: "transparent",
                  color: loading === key ? "#2DD4A8" : "#E8ECF4",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "13px",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                  borderBottom: "1px solid #1E2738",
                  opacity: loading && loading !== key ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading)
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      "#1C2435";
                }}
                onMouseLeave={(e) => {
                  if (!loading)
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      "transparent";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {loading === key && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{
                        animation: "spin 1s linear infinite",
                      }}
                    >
                      <circle cx="12" cy="12" r="1" />
                      <path d="M12 2v20M2 12h20" />
                    </svg>
                  )}
                  {label}
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "8px 16px",
              backgroundColor: "#171D2A",
              borderTop: "1px solid #1E2738",
              fontSize: "11px",
              color: "#5A6478",
            }}
          >
            Format CSV (ZIP pour tous les enregistrements)
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
