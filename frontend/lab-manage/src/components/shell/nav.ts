import { icons } from "@/components/ui/icons";

// ─── App Shell ───────────────────────────────────────────────────────
export const NAV = [
  { key: "dashboard",  label: "Tableau de bord", icon: icons.dashboard,  roles: ["admin", "technician", "viewer"] },
  { key: "products",   label: "Produits",         icon: icons.products,   roles: ["admin", "technician", "viewer"] },
  // FIX : technicien peut voir les fournisseurs (lecture seule)
  { key: "suppliers",  label: "Fournisseurs",     icon: icons.suppliers,  roles: ["admin", "technician"] },
  { key: "categories", label: "Catégories",       icon: icons.products,   roles: ["admin", "technician", "viewer"] },
  { key: "locations",  label: "Localisations",    icon: icons.products,   roles: ["admin", "technician", "viewer"] },
  { key: "movements",  label: "Mouvements",       icon: icons.movements,  roles: ["admin", "technician", "viewer"] },
  { key: "users",      label: "Utilisateurs",     icon: icons.users,      roles: ["admin"] },
];

export const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  dashboard:  { title: "Tableau de bord",         subtitle: "Vue d'ensemble du laboratoire" },
  products:   { title: "Produits",                subtitle: "Gestion des réactifs, consommables et équipements" },
  suppliers:  { title: "Fournisseurs",            subtitle: "Annuaire des fournisseurs" },
  categories: { title: "Catégories",              subtitle: "Gestion des catégories de produits" },
  locations:  { title: "Localisations",           subtitle: "Gestion des lieux de stockage" },
  movements:  { title: "Mouvements de stock",     subtitle: "Entrées et sorties de stock" },
  users:      { title: "Utilisateurs",            subtitle: "Gestion des accès" },
};
