/**
 * API Service for Cerebra-MD Dashboard
 * Connects React frontend to FastAPI backend
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth tokens (future use)
api.interceptors.request.use(
  (config) => {
    // Add auth header if token exists
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API Functions
export const apiService = {
  // Health check
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  },

  // Funnel KPIs
  async getFunnelKPIs(params?: Record<string, any>) {
    const response = await api.get('/v1/kpis/funnel', { params });
    return response.data;
  },

  // Denial KPIs  
  async getDenialKPIs(params?: Record<string, any>) {
    const response = await api.get('/v1/kpis/denials', { params });
    return response.data;
  },

  // Cash Realization KPIs
  async getCashKPIs(params?: Record<string, any>) {
    const response = await api.get('/v1/kpis/cash', { params });
    return response.data;
  },

  // Operational KPIs
  async getOperationalKPIs(params?: Record<string, any>) {
    const response = await api.get('/v1/kpis/ops', { params });
    return response.data;
  },

  // Meta dimensions (filters)
  async getDimensions(includeCounts = false) {
    const response = await api.get('/v1/meta/dimensions', {
      params: { includeCounts }
    });
    return response.data;
  },

  // Export functionality
  async createExport(exportRequest: {
    reportType: string;
    format: string;
    filters: Record<string, any>;
  }) {
    const response = await api.post('/v1/exports', exportRequest);
    return response.data;
  },

  async getExportStatus(exportId: string) {
    const response = await api.get(`/v1/exports/${exportId}`);
    return response.data;
  }
};

export default api;