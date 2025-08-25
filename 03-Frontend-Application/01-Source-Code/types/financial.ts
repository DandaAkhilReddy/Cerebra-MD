// Financial Dashboard Data Types

export interface FinancialMetric {
  id: string;
  title: string;
  value: number;
  formatted: string;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  target?: number;
  icon: any; // Using any for now to avoid React.ReactNode import issues
  color: string;
  subtitle?: string;
}

export interface CollectionData {
  date: string;
  charges: number;
  collections: number;
  deposits: number;
  collectionRate: number;
}

export interface ARAgingData {
  range: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface PayerPerformanceData {
  payer: string;
  avgDays: number;
  collectionRate: number;
  volume: number;
  trend: 'up' | 'down' | 'stable';
}

export interface DateRangeOption {
  value: string;
  label: string;
  days: number;
}

// API Response Types
export interface FinancialAPIResponse {
  success: boolean;
  data: {
    metrics: FinancialMetric[];
    collectionTrend: CollectionData[];
    arAging: ARAgingData[];
    payerPerformance: PayerPerformanceData[];
  };
  timestamp: string;
}

export interface DashboardFilters {
  dateRange: string;
  payer?: string;
  department?: string;
}

// Chart Configuration Types
export interface ChartConfig {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
  };
  responsive: {
    breakpoints: {
      mobile: number;
      tablet: number;
      desktop: number;
    };
  };
}

export default {
  FinancialMetric,
  CollectionData,
  ARAgingData,
  PayerPerformanceData,
  DateRangeOption,
  FinancialAPIResponse,
  DashboardFilters,
  ChartConfig
};