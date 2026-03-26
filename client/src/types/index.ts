export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  sell_price: number;
  buy_price: number;
  reorder_point: number;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  category: string;
  sell_price: number;
  buy_price: number;
  quantity: number;
  location: string;
  reorder_point: number;
  stock_status: 'LOW' | 'MEDIUM' | 'HIGH';
  is_active: boolean;
}

export interface InventoryUpdate {
  product_id: number;
  quantity: number;
  location?: string;
}

export interface Customer {
  id: number;
  name: string;
  type: string;
  contact_info?: string;
  address?: string;
  created_at: string;
  is_active: boolean;
}

export interface SaleItem {
  product_id: number;
  quantity: number;
  unit_price: number;
  product?: Product;
}

export interface Sale {
  id: number;
  customer_id: number;
  sale_date: string;
  season: string;
  status: 'pending' | 'completed' | 'cancelled';
  completed_date?: string | null;
  customer?: Customer;
  items: SaleItem[];
}

export interface SaleCreateItem {
  product_id: number;
  quantity: number;
}

export interface SaleCreate {
  customer_id: number;
  sale_date?: string;
  items: SaleCreateItem[];
}

export interface SalesSummary {
  customer_type: string;
  total_sales: number;
  total_items_sold: number;
  estimated_revenue: number;
}

export interface PurchaseOrderItem {
  product_id: number;
  quantity: number;
  buy_price: number;
  product?: Product;
}

export interface PurchaseOrder {
  id: number;
  status: 'pending' | 'ordered' | 'received' | 'cancelled';
  ordered_date?: string;
  received_date?: string;
  created_at: string;
  items: PurchaseOrderItem[];
}

export interface PurchaseOrderCreate {
  items: {
    product_id: number;
    quantity: number;
  }[];
}

export interface TopSeller {
  product_name: string;
  sku: string;
  category: string;
  total_sold: number;
  order_count: number;
  avg_per_order: number;
}

export interface ReorderRecommendation {
  name: string;
  sku: string;
  category: string;
  sold_this_season: number;
  current_stock: number;
  reorder_point: number;
  status: 'ORDER NOW' | 'PLAN TO ORDER' | 'OK';
  suggested_order_qty: number;
}

export interface BiggestCustomer {
  customer_id: number;
  customer_name: string;
  product_name: string;
  total_bought: number;
}

export interface TopMargin {
  name: string;
  sku: string;
  category: string;
  sell_price: number;
  buy_price: number;
  margin_percent: number;
}

export interface TopProfit {
  name: string;
  sku: string;
  category: string;
  total_sold: number;
  total_profit: number;
}

export interface AnalyticsResponse {
  success: boolean;
  season?: string;
  results?: TopSeller[];
  recommendations?: ReorderRecommendation[];
}

export type Season = 'spring' | 'summer' | 'fall' | 'winter';