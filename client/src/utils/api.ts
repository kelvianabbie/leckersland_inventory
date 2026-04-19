import axios, { AxiosInstance } from 'axios';
import {
  ApiResponse,
  InventoryItem,
  TopSeller,
  ReorderRecommendation,
  Sale,
  SaleCreate,
  SalesSummary,
  Customer,
  PurchaseOrder,
  PurchaseOrderCreate,
  Season,
  BiggestCustomer,
  TopMargin,
  TopProfit,
  Vendor
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://leckersland-inventory.onrender.com/api';

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

//Inventory endpoints
export const inventoryAPI = {
  getAll: async (params?: {
    search?: string;
    category?: string;
    stock?: 'low' | 'medium' | 'high';
  }): Promise<ApiResponse<{ inventory: InventoryItem[] }>> => {
    const response = await api.get('/inventory', { params });
    return response.data;
  },
  update: async (data: { product_id: number; quantity: number; location?: string }): 
    Promise<ApiResponse<{ inventory: any }>> => {
    const response = await api.post('/inventory/update', data);
    return response.data;
  },
};

//Analytics endpoints
export const analyticsAPI = {
  getTopSellers: async (season: Season = 'summer', limit: number = 10): 
    Promise<ApiResponse<{ season: string; results: TopSeller[] }>> => {
    const response = await api.get(`/analytics/top-sellers`, { params: { season, limit } });
    return response.data;
  },
  getReorderRecommendations: async (season: Season):
    Promise<ApiResponse<{ season: string; recommendations: ReorderRecommendation[] }>> => {
    const response = await api.get('/analytics/reorder-recommendations', {
      params: { season }
    });
    return response.data;
  },
  getBiggestCustomer: async (season: Season, mode: 'quantity' | 'revenue'): 
    Promise<ApiResponse<{ customer: any; products: any[] }>> => {
      const res = await api.get('/analytics/biggest-customer', { params: { season, mode }});
      return res.data;
  },
  getBiggestVendor: async (mode: 'quantity' | 'expense'): 
    Promise<ApiResponse<{ vendor: any; products: any[] }>> => {
      const res = await api.get('/analytics/biggest-vendor', { params: { mode } });
      return res.data;
  },
  getTopMargins: async (limit: number = 10): Promise<ApiResponse<{ results: TopMargin[] }>> => {
    const res = await api.get('/analytics/top-margins', { params: { limit } });
    return res.data;
  },
  getTopProfit: async (season: Season, limit: number = 10): Promise<ApiResponse<{ season: string; results: TopProfit[] }>> => {
    const res = await api.get('/analytics/top-profit', { params: { season, limit } });
    return res.data;
  },
};

// Sales endpoints
export const salesAPI = {
  getAll: async (params: { 
    limit?: number;
    page?: number;
    customer_id?: number; 
    product_id?: number;
    status?: 'pending' | 'completed' | 'cancelled';
    season?: Season;
    month?: number;
  } = {}): Promise<ApiResponse<{ sales: Sale[] }>> => {
    const response = await api.get('/sales', { params });
    return response.data;
  },
  create: async (data: SaleCreate): Promise<ApiResponse<{
    sale: Sale;
    inventory_updated: boolean;
    reorder_suggested: boolean
  }>> => {
    const response = await api.post('/sales', data);
    return response.data;
  },
  updateStatus: async (id: number, status: 'pending' | 'completed' | 'cancelled'): 
    Promise<ApiResponse<{ sale: Sale }>> => {
    const response = await api.put(`/sales/${id}/status`, { status });
    return response.data;
  },
  getSummary: async (): Promise<ApiResponse<{ results: SalesSummary[] }>> => {
    const response = await api.get('/sales/summary/customer-type');
    return response.data;
  },
  getById: async (id: number): Promise<ApiResponse<{ sale: Sale }>> => {
    const response = await api.get(`/sales/${id}`);
    return response.data;
  },
  updateCreditMemo: (id: number, credit_memo: number) =>
    api.put(`/sales/${id}/credit-memo`, { credit_memo }
  ),
};

//Customers endpoints
export const customersAPI = {
  getAll: async (params?: { includeInactive?: boolean }):
    Promise<ApiResponse<{ customers: Customer[] }>> => {
    const response = await api.get('/customers', { params });
    return response.data;
  },
  create: async (data: { name: string; type: string; contact_info?: string; address?: string }): 
    Promise<ApiResponse<{ customer: Customer }>> => {
    const response = await api.post('/customers', data);
    return response.data;
  },
  update: (id: number, data: { name: string; type: string; contact_info?: string; address?: string }) =>
    api.put(`/customers/${id}`, data),
  deactivate: (id: number) =>
    api.put(`/customers/${id}/deactivate`),
  reactivate: (id: number) =>
    api.put(`/customers/${id}/reactivate`),
  getById: async (id: number): 
    Promise<ApiResponse<{ customer: Customer }>> => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },
};

//Vendors endpoints
export const vendorsAPI = {
  getAll: async(params?: { includeInactive?: boolean }): 
    Promise<ApiResponse<{ vendors: Vendor[] }>> => {
    const response = await api.get('/vendors', { params });
    return response.data;
  },
  create: async (data: { name: string; contact_info?: string; address?: string }):
    Promise<ApiResponse<{ vendor: Vendor }>> => {
    const response = await api.post('/vendors', data);
    return response.data;
  },
  update: (id: number, data: { name: string; contact_info?: string; address?: string }) =>
    api.put(`/vendors/${id}`, data),
  deactivate: (id: number) =>
    api.put(`/vendors/${id}/deactivate`),
  reactivate: (id: number) =>
    api.put(`/vendors/${id}/reactivate`),
  getById: async (id: number): 
    Promise<ApiResponse<{ vendor: Vendor }>> => {
    const response = await api.get(`/vendors/${id}`);
    return response.data;
  },
};

//Orders endpoints
export const ordersAPI = {
  getAll: async (params: { status?: string; limit?: number; page?: number; vendor_id?: number; month?: number } = {}): 
    Promise<ApiResponse<{ orders: PurchaseOrder[] }>> => {
    const response = await api.get('/orders', { params });
    return response.data;
  },
  create: async (data: PurchaseOrderCreate): 
    Promise<ApiResponse<{ order: PurchaseOrder }>> => {
    const response = await api.post('/orders', data);
    return response.data;
  },
  updateStatus: async (id: number, status: 'pending' | 'ordered' | 'received' | 'cancelled'): 
    Promise<ApiResponse<{ 
      order: PurchaseOrder; 
      inventory_updated: boolean 
    }>> => {
    const response = await api.put(`/orders/${id}/status`, { status });
    return response.data;
  },
  delete: async (id: number): Promise<ApiResponse<{ success: boolean }>> => {
    const response = await api.delete(`/orders/${id}`);
    return response.data;
  },
};

export const productsAPI = {
  getAll: () => api.get('/products'),
  create: (data: any) => api.post('/products', data),
  update: (id: number, data: any) => api.put(`/products/${id}`, data),
  deactivate: (id: number) => api.put(`/products/${id}/deactivate`),
  reactivate: (id: number) => api.put(`/products/${id}/reactivate`)
};

export const paymentsAPI = {
  create: (data: { sale_id: number; amount: number; payment_date?: string }) =>
    api.post('/payments', data),
  getBySale: (saleId: number) =>
    api.get(`/payments/${saleId}`)
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);