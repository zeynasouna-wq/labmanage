/**
 * EXEMPLE D'INTÉGRATION - Composant Export
 * 
 * Ce fichier montre comment intégrer le composant ExportComponent
 * dans votre application Next.js
 */

// ── OPTION 1 : Dans un Admin Dashboard ──
import ExportComponent from "@/app/ExportComponent";
import { useAuthContext } from "@/contexts/auth"; // votre contexte auth

export function AdminDashboard() {
  const { user, token } = useAuthContext();

  // Vérifier que c'est un admin
  if (user?.role !== "admin") {
    return <div>Accès non autorisé</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Dashboard Admin</h2>
      
      {/* Section Export */}
      <div
        style={{
          marginTop: "20px",
          padding: "16px",
          backgroundColor: "var(--bg-card)",
          borderRadius: "8px",
          border: "1px solid var(--border)",
        }}
      >
        <h3 style={{ marginBottom: "12px", fontSize: "16px", fontWeight: "600" }}>
          📥 Exporter les Données
        </h3>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
          Téléchargez tous les enregistrements, l'historique des mouvements et les alertes
          en format CSV pour sauvegarde, analyse ou conformité.
        </p>
        
        <ExportComponent
          token={token}
          apiBase="https://labmanage.onrender.com"
          onSuccess={(message) => {
            console.log(message);
            // Optionnellement: afficher une notification
          }}
          onError={(error) => {
            console.error(error);
            // Optionnellement: afficher une alerte d'erreur
          }}
        />
      </div>
    </div>
  );
}

// ── OPTION 2 : Dans un Menu Utilisateur ──
export function UserMenu({ token, user }: { token: string; user: any }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setShowMenu(!showMenu)}>Menu</button>

      {showMenu && user?.role === "admin" && (
        <div style={{ position: "absolute", top: "100%", right: 0 }}>
          <h4 style={{ padding: "12px", marginBottom: "8px" }}>Admin</h4>
          
          <ExportComponent
            token={token}
            onSuccess={(msg) => {
              console.log(msg);
              setShowMenu(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── OPTION 3 : Page Admin Dédiée ──
// pages/admin/export.tsx
"use client";

import { useState, useContext } from "react";
import ExportComponent from "@/app/ExportComponent";

const NotifContext = createContext<any>(null);

export default function ExportPage() {
  const { showNotif } = useContext(NotifContext);
  const [userToken, setUserToken] = useState<string>("");

  // Récupérer le token du contexte auth ou localStorage
  useEffect(() => {
    const token = localStorage.getItem("labostock_token");
    if (token) setUserToken(token);
  }, []);

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "40px auto",
        padding: "24px",
        backgroundColor: "var(--bg-card)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
      }}
    >
      <h1 style={{ marginBottom: "8px", fontSize: "24px", fontWeight: "700" }}>
        📊 Exporter les Données
      </h1>
      <p style={{ marginBottom: "24px", color: "var(--text-secondary)" }}>
        Téléchargez les enregistrements de LaboStock en format CSV pour sauvegarde,
        analyse ou import dans d'autres outils.
      </p>

      {/* Zones d'information */}
      <div style={{ marginBottom: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <InfoCard title="Produits" icon="📦" description="Liste complète des produits" />
        <InfoCard title="Historique" icon="📜" description="Tous les mouvements de stock" />
        <InfoCard title="Alertes" icon="⚠️" description="Toutes les alertes système" />
        <InfoCard title="Utilisateurs" icon="👥" description="Liste des comptables" />
      </div>

      {/* Composant Export */}
      <ExportComponent
        token={userToken}
        onSuccess={(message) => {
          showNotif?.({
            type: "success",
            title: "Succès",
            message,
          });
        }}
        onError={(error) => {
          showNotif?.({
            type: "error",
            title: "Erreur",
            message: error,
          });
        }}
      />

      {/* Guide d'utilisation */}
      <div
        style={{
          marginTop: "24px",
          padding: "16px",
          backgroundColor: "var(--bg-tertiary)",
          borderRadius: "var(--radius)",
          fontSize: "13px",
          color: "var(--text-secondary)",
        }}
      >
        <h4 style={{ marginBottom: "8px", color: "var(--text-primary)" }}>💡 Conseils</h4>
        <ul style={{ marginLeft: "20px" }}>
          <li>Utilisez "Tous les enregistrements" pour une sauvegarde complète</li>
          <li>Les fichiers CSV peuvent être ouverts avec Excel ou Google Sheets</li>
          <li>Sauvegardez régulièrement vos données pour conformité</li>
          <li>Utilisez les exports pour l'analyse BI ou reporting</li>
        </ul>
      </div>
    </div>
  );
}

function InfoCard({ title, icon, description }: any) {
  return (
    <div
      style={{
        padding: "12px",
        backgroundColor: "var(--bg-secondary)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ fontSize: "20px", marginBottom: "4px" }}>{icon}</div>
      <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "2px" }}>{title}</div>
      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{description}</div>
    </div>
  );
}

// ── OPTION 4 : Bouton Flottant ──
export function ExportButton({ token }: { token: string }) {
  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 50 }}>
      <ExportComponent
        token={token}
        onSuccess={(msg) => console.log(msg)}
      />
    </div>
  );
}

// ── OPTION 5 : Hook Personnalisé ──
/**
 * Hook pour exporter facilement depuis n'importe où
 */
export function useExport(token: string) {
  const [loading, setLoading] = useState(false);

  const download = async (type: "all" | "products" | "movements" | "alerts" | "users" | "suppliers" | "locations" | "categories" | "lots") => {
    setLoading(true);
    try {
      const url = `https://labmanage.onrender.com/export/csv/${type}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Export échoué");

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `labmanage_${type}_${new Date().toISOString().split("T")[0]}.${type === "all" ? "zip" : "csv"}`;
      a.click();
      URL.revokeObjectURL(downloadUrl);

      return true;
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { download, loading };
}

// Utilisation du hook
function MyComponent() {
  const token = localStorage.getItem("labostock_token");
  const { download, loading } = useExport(token);

  return (
    <button onClick={() => download("all")} disabled={loading}>
      {loading ? "Téléchargement..." : "Télécharger Tout"}
    </button>
  );
}
