export interface Product {
  id: number;
  code: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  alert_stock?: number;
  supplier_id: number | null;
  location_id: number | null;
  category_id: number | null;
  threshold?: number;
  stock?: number;
}

export interface ProductLot {
  id: number;
  product_id: number;
  lot_number: string;
  quantity: number;
  expiry_date: string | null;
  notes: string | null;
}

export interface StockMovement {
  id: number;
  product_id: number;
  movement_type: string;
  quantity: number;
  stock_before: number;
  stock_after: number;
  notes?: string;
  created_at: string;
  product?: Product;
}

export interface Supplier {
  id: number;
  name: string;
}

export interface Location {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
}
