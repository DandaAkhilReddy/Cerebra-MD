/**
 * API Service for Cerebra-MD Dashboard
 * Connects React frontend to FastAPI backend
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { QueryClient } from '@tanstack/react-query';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor for authentication
apiClient.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // Get auth token from localStorage
    const token = localStorage.getItem('cerebra_auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response time for performance monitoring
    const config = response.config as any;
    if (config.metadata?.startTime) {
      const duration = new Date().getTime() - config.metadata.startTime.getTime();
      console.log(`API Call: ${config.method?.toUpperCase()} ${config.url} - ${duration}ms`);
    }
    
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('cerebra_auth_token');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Handle forbidden access
      console.error('Access denied:', error.response.data);
    } else if (error.response?.status >= 500) {
      // Handle server errors
      console.error('Server error:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

// Common interfaces
interface DateRange {
  startDate: string;
  endDate: string;
}

interface FilterParams extends DateRange {
  facilityId?: string;
  payerId?: string;
  providerId?: string;
}

// KPI Data Types
interface KPIResponse<T> {
  data: T[];
  summary: any;
  filters: {
    facilities: { id: string; name: string }[];
    payers: { id: string; name: string }[];
    providers: { id: string; name: string }[];
  };
  timestamp: string;
}

interface DenialKPI {
  reasonCode: string;
  reasonDescription: string;
  denialCount: number;
  denialPct: number;
  isAvoidable: boolean;
}

interface FunnelKPI {
  facilityId: number;
  facilityName: string;
  doctorId: number;
  doctorName: string;
  reportDate: string;
  encounters: number;
  submitted: number;
  accepted: number;
  denied: number;
  reworked: number;
  paid: number;
  submissionRate: number;
  fpy: number;
  denialRate: number;
  reworkSuccess: number;
}

interface CashKPI {
  reportPeriod: string;
  facilityId: number;
  facilityName: string;
  payerId: number;
  payerName: string;
  totalClaimAmt: number;
  totalPaymentAmt: number;
  totalAdjustmentAmt: number;
  cashRealizationPct: number;
  tatP50Days: number;
  tatP90Days: number;
}

interface OperationalKPI {
  facilityId: number;
  facilityName: string;
  doctorId: number;
  doctorName: string;
  reportDate: string;
  encounters: number;
  avgDaysToSubmit: number;
  pctSubmittedWithin48h: number;
  encountersPerDay: number;
  productivityScore: number;
}

// =============================================================================
// KPI SERVICES
// =============================================================================

export const kpiService = {
  // Get funnel analytics
  getFunnelKPIs: async (params: FilterParams): Promise<KPIResponse<FunnelKPI>> => {
    const response = await apiClient.get('/api/v1/kpis/funnel', { params });
    return response.data;
  },

  // Get denial analytics
  getDenialKPIs: async (params: FilterParams): Promise<KPIResponse<DenialKPI>> => {
    const response = await apiClient.get('/api/v1/kpis/denials', { params });
    return response.data;
  },

  // Get cash realization KPIs
  getCashKPIs: async (params: FilterParams): Promise<KPIResponse<CashKPI>> => {
    const response = await apiClient.get('/api/v1/kpis/cash', { params });
    return response.data;
  },

  // Get operational KPIs
  getOperationalKPIs: async (params: FilterParams): Promise<KPIResponse<OperationalKPI>> => {
    const response = await apiClient.get('/api/v1/kpis/ops', { params });
    return response.data;
  },

  // Get all KPIs summary
  getKPISummary: async (params: FilterParams): Promise<any> => {
    const response = await apiClient.get('/api/v1/kpis/summary', { params });
    return response.data;
  }
};

// =============================================================================
// DENIAL MANAGEMENT SERVICES
// =============================================================================

export const denialService = {
  // Get comprehensive denial analytics
  getDenialAnalytics: async (params: FilterParams & { 
    specialty?: string;
    category?: string; 
  }): Promise<any> => {
    const response = await apiClient.get('/api/v1/denials/analytics', { params });
    return response.data;
  },

  // Get denial trends
  getDenialTrends: async (params: FilterParams): Promise<any> => {
    const response = await apiClient.get('/api/v1/denials/trends', { params });
    return response.data;
  },

  // Get denial reasons breakdown
  getDenialReasons: async (params: FilterParams): Promise<any> => {
    const response = await apiClient.get('/api/v1/denials/reasons', { params });
    return response.data;
  },

  // Get prevention opportunities
  getPreventionOpportunities: async (params: FilterParams): Promise<any> => {
    const response = await apiClient.get('/api/v1/denials/prevention', { params });
    return response.data;
  }
};

// =============================================================================
// PROVIDER PERFORMANCE SERVICES
// =============================================================================

export const providerService = {
  // Get provider performance analytics
  getProviderPerformance: async (params: FilterParams & { 
    specialty?: string;
    department?: string; 
  }): Promise<any> => {
    const response = await apiClient.get('/api/v1/providers/performance', { params });
    return response.data;
  },

  // Get individual provider details
  getProviderDetails: async (providerId: string, params: DateRange): Promise<any> => {
    const response = await apiClient.get(`/api/v1/providers/${providerId}/details`, { params });
    return response.data;
  },

  // Get provider benchmarks
  getProviderBenchmarks: async (params: FilterParams): Promise<any> => {
    const response = await apiClient.get('/api/v1/providers/benchmarks', { params });
    return response.data;
  },

  // Get productivity metrics
  getProductivityMetrics: async (params: FilterParams): Promise<any> => {
    const response = await apiClient.get('/api/v1/providers/productivity', { params });
    return response.data;
  }
};

// =============================================================================
// REVENUE ANALYTICS SERVICES
// =============================================================================

export const revenueService = {
  // Get comprehensive revenue analytics
  getRevenueAnalytics: async (params: FilterParams & { 
    includeProjections?: boolean;
    granularity?: 'daily' | 'weekly' | 'monthly'; 
  }): Promise<any> => {
    const response = await apiClient.get('/api/v1/revenue/analytics', { params });
    return response.data;
  },

  // Get revenue forecasts
  getRevenueForecast: async (params: FilterParams & { 
    forecastDays?: number;
    censusData?: boolean; 
  }): Promise<any> => {
    const response = await apiClient.get('/api/v1/revenue/forecast', { params });
    return response.data;
  },

  // Get payer mix analysis
  getPayerMixAnalysis: async (params: FilterParams): Promise<any> => {
    const response = await apiClient.get('/api/v1/revenue/payer-mix', { params });
    return response.data;
  },

  // Get census-based predictions
  getCensusPredictions: async (params: FilterParams): Promise<any> => {
    const response = await apiClient.get('/api/v1/revenue/census-predictions', { params });
    return response.data;
  }
};

// =============================================================================
// ACCOUNTS RECEIVABLE SERVICES
// =============================================================================

export const arService = {
  // Get AR aging analysis
  getARAnalytics: async (params: FilterParams): Promise<any> => {
    const response = await apiClient.get('/api/v1/ar/analytics', { params });
    return response.data;
  },

  // Get collection performance
  getCollectionPerformance: async (params: FilterParams): Promise<any> => {
    const response = await apiClient.get('/api/v1/ar/collection-performance', { params });
    return response.data;
  },

  // Get bad debt analysis
  getBadDebtAnalysis: async (params: FilterParams): Promise<any> => {
    const response = await apiClient.get('/api/v1/ar/bad-debt', { params });
    return response.data;
  }
};

// =============================================================================
// ENCOUNTER MANAGEMENT SERVICES
// =============================================================================

export const encounterService = {
  // Get encounter analytics
  getEncounterAnalytics: async (params: FilterParams): Promise<any> => {
    const response = await apiClient.get('/api/v1/encounters/analytics', { params });
    return response.data;
  },

  // Get encounter processing delays
  getProcessingDelays: async (params: FilterParams): Promise<any> => {
    const response = await apiClient.get('/api/v1/encounters/delays', { params });
    return response.data;
  },

  // Get charge capture analysis
  getChargeCaptureAnalysis: async (params: FilterParams): Promise<any> => {
    const response = await apiClient.get('/api/v1/encounters/charge-capture', { params });
    return response.data;
  }
};

// =============================================================================
// CLAIMS MANAGEMENT SERVICES
// =============================================================================

export const claimsService = {
  // Get claims analytics
  getClaimsAnalytics: async (params: FilterParams): Promise<any> => {
    const response = await apiClient.get('/api/v1/claims/analytics', { params });
    return response.data;
  },

  // Get submission performance
  getSubmissionPerformance: async (params: FilterParams): Promise<any> => {
    const response = await apiClient.get('/api/v1/claims/submission', { params });
    return response.data;
  },

  // Get first-pass yield analysis
  getFirstPassYield: async (params: FilterParams): Promise<any> => {
    const response = await apiClient.get('/api/v1/claims/first-pass-yield', { params });
    return response.data;
  }
};

// =============================================================================
// FACILITY MANAGEMENT SERVICES
// =============================================================================

export const facilityService = {
  // Get facility performance
  getFacilityPerformance: async (params: FilterParams): Promise<any> => {
    const response = await apiClient.get('/api/v1/facilities/performance', { params });
    return response.data;
  },

  // Get facility benchmarks
  getFacilityBenchmarks: async (params: FilterParams): Promise<any> => {
    const response = await apiClient.get('/api/v1/facilities/benchmarks', { params });
    return response.data;
  }
};

// =============================================================================
// AUTHENTICATION SERVICES
// =============================================================================

export const authService = {
  // Login
  login: async (credentials: { email: string; password: string }): Promise<any> => {
    const response = await apiClient.post('/api/v1/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('cerebra_auth_token', response.data.token);
    }
    return response.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    await apiClient.post('/api/v1/auth/logout');
    localStorage.removeItem('cerebra_auth_token');
  },

  // Refresh token
  refreshToken: async (): Promise<any> => {
    const response = await apiClient.post('/api/v1/auth/refresh');
    if (response.data.token) {
      localStorage.setItem('cerebra_auth_token', response.data.token);
    }
    return response.data;
  },

  // Get current user
  getCurrentUser: async (): Promise<any> => {
    const response = await apiClient.get('/api/v1/auth/me');
    return response.data;
  }
};

// =============================================================================
// REPORTING SERVICES
// =============================================================================

export const reportService = {
  // Generate custom report
  generateReport: async (reportConfig: any): Promise<any> => {
    const response = await apiClient.post('/api/v1/reports/generate', reportConfig);
    return response.data;
  },

  // Export data
  exportData: async (exportConfig: any): Promise<Blob> => {
    const response = await apiClient.post('/api/v1/reports/export', exportConfig, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Get scheduled reports
  getScheduledReports: async (): Promise<any> => {
    const response = await apiClient.get('/api/v1/reports/scheduled');
    return response.data;
  }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Health check
export const healthCheck = async (): Promise<any> => {
  const response = await apiClient.get('/health');
  return response.data;
};

// Get system info
export const getSystemInfo = async (): Promise<any> => {
  const response = await apiClient.get('/');
  return response.data;
};

// Query client configuration for React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Export the configured axios instance for direct use
export default apiClient;