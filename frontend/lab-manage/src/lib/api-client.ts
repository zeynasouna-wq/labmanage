// ─── API Configuration ───────────────────────────────────────────────
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

// ─── API Service Layer ───────────────────────────────────────────────
export const api = {
  token: null as string | null,
  async request(method: string, path: string, body: Record<string, unknown> | null = null) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    const opts: { method: string; headers: Record<string, string>; body?: string } = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(`${API_BASE}${path}`, opts);
      if (res.status === 401) {
        this.token = null;
        localStorage.removeItem("NGStock_token");
        window.location.reload();
        throw new Error("Session expirée");
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // FastAPI validation errors return detail as an array
        let detail = err.detail;
        if (Array.isArray(detail)) {
          detail = detail.map((e: any) => `${e.loc?.join(".")}: ${e.msg}`).join(" | ");
        }
        throw new Error(detail || `Erreur ${res.status}`);
      }
      if (res.status === 204) return null;
      return res.json();
    } catch (error) {
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new Error(`Impossible de contacter le serveur (${API_BASE}). Assurez-vous que le backend est en cours d'exécution.`);
      }
      throw error;
    }
  },
  get: (p: string) => api.request("GET", p),
  post: (p: string, b: Record<string, unknown>) => api.request("POST", p, b),
  patch: (p: string, b: Record<string, unknown>) => api.request("PATCH", p, b),
  del: (p: string) => api.request("DELETE", p),
};
