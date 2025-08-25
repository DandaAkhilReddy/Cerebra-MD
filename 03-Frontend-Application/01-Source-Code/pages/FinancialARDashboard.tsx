import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Receipt,
  CreditCard,
  ShowChart,
  Warning,
  CheckCircle,
  Schedule,
  PredictionsIcon,
  RefreshIcon
} from '@mui/icons-material';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, subWeeks, subMonths, subYears, isAfter, parseISO } from 'date-fns';

// Types for our financial data
interface FinancialMetric {
  id: string;
  title: string;
  value: number;
  formatted: string;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  target?: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

interface CollectionData {
  date: string;
  charges: number;
  collections: number;
  deposits: number;
  collectionRate: number;
}

interface ARAgingData {
  range: string;
  amount: number;
  percentage: number;
  color: string;
}

interface PayerPerformanceData {
  payer: string;
  avgDays: number;
  collectionRate: number;
  volume: number;
  trend: 'up' | 'down' | 'stable';
}

// Sample data - In real app, this would come from API
const generateSampleData = (days: number): CollectionData[] => {
  const data: CollectionData[] = [];
  const baseCharges = 240000;
  const baseCollections = 220000;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
    const dayVariation = (Math.random() - 0.5) * 0.3;
    const charges = Math.round(baseCharges * (1 + dayVariation));
    const collections = Math.round(baseCollections * (1 + dayVariation * 0.8));
    const deposits = Math.round(collections * (0.85 + Math.random() * 0.15));
    
    data.push({
      date,
      charges,
      collections,
      deposits,
      collectionRate: (collections / charges) * 100
    });
  }
  
  return data;
};

const arAgingData: ARAgingData[] = [
  { range: '0-30 Days', amount: 12400000, percentage: 68, color: '#4caf50' },
  { range: '31-60 Days', amount: 3800000, percentage: 21, color: '#ff9800' },
  { range: '61-90 Days', amount: 1400000, percentage: 8, color: '#f44336' },
  { range: '90+ Days', amount: 600000, percentage: 3, color: '#9e9e9e' }
];

const payerPerformanceData: PayerPerformanceData[] = [
  { payer: 'Medicare', avgDays: 14, collectionRate: 98.5, volume: 2840000, trend: 'up' },
  { payer: 'Blue Cross', avgDays: 21, collectionRate: 96.8, volume: 1920000, trend: 'up' },
  { payer: 'UnitedHealth', avgDays: 18, collectionRate: 97.2, volume: 1650000, trend: 'stable' },
  { payer: 'Anthem', avgDays: 28, collectionRate: 94.1, volume: 1340000, trend: 'down' },
  { payer: 'Medicaid', avgDays: 23, collectionRate: 95.3, volume: 980000, trend: 'up' }
];

const FinancialARDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<string>('yesterday');
  const [isLoading, setIsLoading] = useState(false);

  // Generate data based on selected date range
  const chartData = useMemo(() => {
    const days = {
      'yesterday': 1,
      'last7days': 7,
      'last30days': 30,
      'last90days': 90,
      'lastYear': 365
    }[dateRange] || 1;
    
    return generateSampleData(days);
  }, [dateRange]);

  // Calculate current period metrics
  const currentMetrics = useMemo(() => {
    const today = chartData[chartData.length - 1];
    const yesterday = chartData[chartData.length - 2];
    const totalCharges = chartData.reduce((sum, day) => sum + day.charges, 0);
    const totalCollections = chartData.reduce((sum, day) => sum + day.collections, 0);
    const totalDeposits = chartData.reduce((sum, day) => sum + day.deposits, 0);
    
    const avgCollectionRate = (totalCollections / totalCharges) * 100;
    const yesterdayCollectionRate = yesterday ? (yesterday.collections / yesterday.charges) * 100 : 0;
    
    // Calculate expected deposits for today (predictive)
    const avgDepositRatio = totalDeposits / totalCollections;
    const expectedDeposits = Math.round(today.collections * avgDepositRatio);
    
    // Calculate AR total from aging data
    const totalAR = arAgingData.reduce((sum, bucket) => sum + bucket.amount, 0);
    
    // Days Sales Outstanding (DSO)
    const avgDailyCharges = totalCharges / chartData.length;
    const dso = Math.round(totalAR / avgDailyCharges);

    const metrics: FinancialMetric[] = [
      {
        id: 'charges',
        title: 'Total Charges Billed',
        value: today.charges,
        formatted: `$${(today.charges / 1000).toFixed(0)}K`,
        change: yesterday ? ((today.charges - yesterday.charges) / yesterday.charges) * 100 : 0,
        changeType: yesterday && today.charges > yesterday.charges ? 'increase' : 'decrease',
        target: 240000,
        icon: <Receipt />,
        color: '#1976d2',
        subtitle: dateRange === 'yesterday' ? 'Yesterday' : `Total ${dateRange.replace(/([A-Z])/g, ' $1').toLowerCase()}`
      },
      {
        id: 'collections',
        title: 'Collections Received',
        value: today.collections,
        formatted: `$${(today.collections / 1000).toFixed(0)}K`,
        change: yesterday ? ((today.collections - yesterday.collections) / yesterday.collections) * 100 : 0,
        changeType: yesterday && today.collections > yesterday.collections ? 'increase' : 'decrease',
        target: 220000,
        icon: <AccountBalance />,
        color: '#388e3c',
        subtitle: dateRange === 'yesterday' ? 'Yesterday' : `Total ${dateRange.replace(/([A-Z])/g, ' $1').toLowerCase()}`
      },
      {
        id: 'deposits',
        title: 'Expected Deposits Today',
        value: expectedDeposits,
        formatted: `$${(expectedDeposits / 1000).toFixed(0)}K`,
        change: 12.5,
        changeType: 'increase',
        icon: <CreditCard />,
        color: '#7b1fa2',
        subtitle: 'AI Predicted Amount'
      },
      {
        id: 'collectionRate',
        title: 'Collection Rate',
        value: avgCollectionRate,
        formatted: `${avgCollectionRate.toFixed(1)}%`,
        change: avgCollectionRate - yesterdayCollectionRate,
        changeType: avgCollectionRate > yesterdayCollectionRate ? 'increase' : 'decrease',
        target: 95,
        icon: <ShowChart />,
        color: '#f57c00',
        subtitle: 'Collections / Charges'
      },
      {
        id: 'totalAR',
        title: 'Total AR Outstanding',
        value: totalAR,
        formatted: `$${(totalAR / 1000000).toFixed(1)}M`,
        change: -5.2,
        changeType: 'decrease',
        icon: <AccountBalance />,
        color: '#d32f2f',
        subtitle: `${dso} Days Sales Outstanding`
      },
      {
        id: 'cashFlow',
        title: 'Cash Flow Velocity',
        value: (totalCollections / totalAR) * 100,
        formatted: `${((totalCollections / totalAR) * 100).toFixed(1)}%`,
        change: 8.7,
        changeType: 'increase',
        icon: <TrendingUp />,
        color: '#0288d1',
        subtitle: 'Collections / Total AR'
      }
    ];

    return metrics;
  }, [chartData, dateRange]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500); // Simulate API call
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const MetricCard: React.FC<{ metric: FinancialMetric }> = ({ metric }) => (
    <Card elevation={3} sx={{ height: '100%', position: 'relative' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Box sx={{ color: metric.color }}>{metric.icon}</Box>
            <Typography variant="h6" color="textSecondary" fontSize="0.9rem">
              {metric.title}
            </Typography>
          </Box>
          <Chip
            label={`${metric.change >= 0 ? '+' : ''}${metric.change.toFixed(1)}%`}
            size="small"
            color={metric.changeType === 'increase' ? 'success' : metric.changeType === 'decrease' ? 'error' : 'default'}
            icon={metric.changeType === 'increase' ? <TrendingUp /> : <TrendingDown />}
          />
        </Box>
        
        <Typography variant="h4" color="primary" fontWeight="bold" mb={1}>
          {metric.formatted}
        </Typography>
        
        {metric.subtitle && (
          <Typography variant="caption" color="textSecondary">
            {metric.subtitle}
          </Typography>
        )}
        
        {metric.target && (
          <Box mt={2}>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption">Target Progress</Typography>
              <Typography variant="caption">
                {((metric.value / metric.target) * 100).toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min((metric.value / metric.target) * 100, 100)}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(0,0,0,0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: metric.color,
                  borderRadius: 3
                }
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            💰 Financial AR Dashboard
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Real-time financial performance and accounts receivable analytics
          </Typography>
        </Box>
        
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Time Period</InputLabel>
            <Select
              value={dateRange}
              label="Time Period"
              onChange={(e) => setDateRange(e.target.value)}
            >
              <MenuItem value="yesterday">Yesterday</MenuItem>
              <MenuItem value="last7days">Last 7 Days</MenuItem>
              <MenuItem value="last30days">Last 30 Days</MenuItem>
              <MenuItem value="last90days">Last 90 Days</MenuItem>
              <MenuItem value="lastYear">Last Year</MenuItem>
            </Select>
          </FormControl>
          
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} disabled={isLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Key Metrics Cards */}
      <Grid container spacing={3} mb={4}>
        {currentMetrics.map((metric) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={metric.id}>
            <MetricCard metric={metric} />
          </Grid>
        ))}
      </Grid>

      {/* Smart Insights Alert */}
      <Alert 
        severity="info" 
        icon={<PredictionsIcon />}
        sx={{ mb: 3 }}
      >
        <Typography variant="subtitle2" fontWeight="bold">
          🤖 AI Insights: 
        </Typography>
        <Typography variant="body2">
          Collections are trending 8.7% above normal. Anthem showing 28-day payment delay (3 days slower than target). 
          Recommend follow-up on 347 pending Anthem claims worth $2.3M.
        </Typography>
      </Alert>

      {/* Charts Section */}
      <Grid container spacing={3} mb={4}>
        {/* Collections vs Charges Trend */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={3} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" mb={2}>
              📈 Collections vs Charges Trend
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => format(parseISO(value), 'MM/dd')} />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <RechartsTooltip 
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  labelFormatter={(value) => format(parseISO(value as string), 'MMM dd, yyyy')}
                />
                <Legend />
                <Area type="monotone" dataKey="charges" stackId="1" stroke="#1976d2" fill="#1976d2" fillOpacity={0.3} name="Charges Billed" />
                <Area type="monotone" dataKey="collections" stackId="2" stroke="#388e3c" fill="#388e3c" fillOpacity={0.3} name="Collections" />
                <Area type="monotone" dataKey="deposits" stackId="3" stroke="#7b1fa2" fill="#7b1fa2" fillOpacity={0.3} name="Deposits" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* AR Aging Distribution */}
        <Grid item xs={12} lg={4}>
          <Paper elevation={3} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" mb={2}>
              ⏰ AR Aging Distribution
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={arAgingData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ range, percentage }) => `${range}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {arAgingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Payer Performance */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" mb={3}>
          🏥 Payer Performance Analysis
        </Typography>
        <Grid container spacing={2}>
          {payerPerformanceData.map((payer) => (
            <Grid item xs={12} sm={6} md={4} lg={2.4} key={payer.payer}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {payer.payer}
                    </Typography>
                    <Chip
                      size="small"
                      icon={payer.trend === 'up' ? <TrendingUp /> : payer.trend === 'down' ? <TrendingDown /> : <Schedule />}
                      label={payer.trend}
                      color={payer.trend === 'up' ? 'success' : payer.trend === 'down' ? 'error' : 'default'}
                    />
                  </Box>
                  
                  <Typography variant="h6" color="primary" mb={1}>
                    {payer.avgDays} days
                  </Typography>
                  
                  <Typography variant="caption" color="textSecondary" display="block">
                    Collection Rate: {payer.collectionRate}%
                  </Typography>
                  
                  <Typography variant="caption" color="textSecondary">
                    Volume: {formatCurrency(payer.volume)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Collection Rate Trend */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" mb={2}>
          📊 Collection Rate Trend
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(value) => format(parseISO(value), 'MM/dd')} />
            <YAxis tickFormatter={(value) => `${value}%`} domain={['dataMin - 5', 'dataMax + 5']} />
            <RechartsTooltip 
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Collection Rate']}
              labelFormatter={(value) => format(parseISO(value as string), 'MMM dd, yyyy')}
            />
            <Line 
              type="monotone" 
              dataKey="collectionRate" 
              stroke="#f57c00" 
              strokeWidth={3}
              dot={{ fill: '#f57c00', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#f57c00', strokeWidth: 2 }}
            />
            {/* Target line */}
            <Line 
              type="monotone" 
              dataKey={() => 95} 
              stroke="#e0e0e0" 
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={false}
              name="Target (95%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
};

export default FinancialARDashboard;