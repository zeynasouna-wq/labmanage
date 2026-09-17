// ─── Access Denied Component ─────────────────────────────────────────
export function AccessDenied() {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
      <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>Accès refusé</div>
      <div>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</div>
    </div>
  );
}
