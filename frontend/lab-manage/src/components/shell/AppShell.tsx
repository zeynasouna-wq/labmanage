"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { icons } from "@/components/ui/icons";
import { NAV, PAGE_META } from "@/components/shell/nav";
import { SuppliersPage } from "@/features/suppliers/components/SuppliersPage";
import { CategoriesPage } from "@/features/categories/components/CategoriesPage";
import { LocationsPage } from "@/features/locations/components/LocationsPage";
import { UsersPage } from "@/features/users/components/UsersPage";
import { MovementsPage } from "@/features/movements/components/MovementsPage";
import { ProductsPage } from "@/features/products/components/ProductsPage";
import { DashboardPage } from "@/features/dashboard/components/DashboardPage";
import { ExportButton } from "@/features/export/components/ExportButton";

export function AppShell({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [page, setPage] = useState("dashboard");
  const meta = PAGE_META[page];
  const userRole = user?.role || "viewer";

  // FIX : filtrage de la nav basé sur le tableau roles de chaque entrée
  const filteredNav = NAV.filter((n) => n.roles.includes(userRole));

  // FIX : redirection uniquement si la page n'est pas autorisée pour ce rôle
  useEffect(() => {
    const allowed = NAV.find((n) => n.key === page);
    if (allowed && !allowed.roles.includes(userRole)) {
      setPage("dashboard");
    }
  }, [page, userRole]);

  return (
    <div className="lab-app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">{icons.flask}</span>
          <h1>NGStock</h1>
          <span className="version">v1.1</span>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {filteredNav.map((n) => (
            <div key={n.key} className={`nav-item ${page === n.key ? "active" : ""}`} onClick={() => setPage(n.key)}>
              {n.icon}
              {n.label}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={onLogout} title="Se déconnecter">
            <div className="user-avatar">{(user?.name || "U")[0].toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{user?.name || "Utilisateur"}</div>
              <div className="user-role">{user?.role || "user"}</div>
            </div>
            {icons.logout}
          </div>
        </div>
      </aside>
      <main className="main-content">
        <div className="page-header">
          <div>
            <div className="page-title">{meta.title}</div>
            <div className="page-subtitle">{meta.subtitle}</div>
          </div>
          {userRole === "admin" && (
            <ExportButton token={api.token || ""} />
          )}
        </div>
        <div className="page-body">
          {page === "dashboard"  && <DashboardPage />}
          {page === "products"   && <ProductsPage />}
          {page === "suppliers"  && <SuppliersPage />}
          {page === "categories" && <CategoriesPage />}
          {page === "locations"  && <LocationsPage />}
          {page === "movements"  && <MovementsPage />}
          {page === "users"      && <UsersPage />}
        </div>
      </main>
    </div>
  );
}
