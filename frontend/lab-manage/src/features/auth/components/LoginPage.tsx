"use client";

import { useState, useContext } from "react";
import { AuthContext } from "@/lib/contexts";
import { icons } from "@/components/ui/icons";

export function LoginPage() {
  const auth = useContext(AuthContext)!;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await auth.login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Identifiants incorrects");
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-bg-grid" />
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-icon">{icons.flask}</span>
          <h1>NGStock</h1>
        </div>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 8, justifyContent: "center" }} disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
