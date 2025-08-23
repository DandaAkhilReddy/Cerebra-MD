// =============================================================================
// Denial Analytics Dashboard
// Cerebra-MD Healthcare Analytics Platform
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  alpha
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Info,
  Download,
  Refresh,
  Warning,
  CheckCircle
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { denialService } from '../services/api';
import { KPICard } from '../components/KPICard';
import { DateRangePicker } from '../components/DateRangePicker';
import { FilterPanel } from '../components/FilterPanel';

// Denial reason categories with colors
const DENIAL_CATEGORIES = {
  'Authorization': '#FF6B6B',
  'Documentation': '#4ECDC4',
  'Coding': '#45B7D1',
  'Medical Necessity': '#FFA07A',
  'Eligibility': '#98D8C8',
  'Other': '#95A5A6'
};

export const DenialAnalytics: React.FC = () => {
  const theme = useTheme();
  const [dateRange, setDateRange] = useState({ start: '2025-01-01', end: '2025-01-31' });
  const [selectedFacility, setSelectedFacility] = useState('all');
  const [selectedPayer, setSelectedPayer] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState('all');

  // Fetch denial data
  const { data: denialData, isLoading, error, refetch } = useQuery({
    queryKey: ['denialAnalytics', dateRange, selectedFacility, selectedPayer, selectedProvider],
    queryFn: () => denialService.getDenialAnalytics({
      startDate: dateRange.start,
      endDate: dateRange.end,
      facilityId: selectedFacility,
      payerId: selectedPayer,
      providerId: selectedProvider
    }),
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  // Calculate KPI metrics
  const kpiMetrics = useMemo(() => {
    if (!denialData) return null;
    
    return {
      totalDenials: denialData.summary.totalDenials,
      denialRate: denialData.summary.denialRate,
      avgOverturnTime: denialData.summary.avgOverturnTime,
      appealSuccessRate: denialData.summary.appealSuccessRate,
      financialImpact: denialData.summary.financialImpact,
      preventableDenials: denialData.summary.preventableDenials
    };
  }, [denialData]);

  // Denial trends by month
  const denialTrends = useMemo(() => {
    if (!denialData?.trends) return [];
    
    return denialData.trends.map(trend => ({
      month: trend.month,
      denials: trend.denialCount,
      rate: trend.denialRate,
      recovered: trend.recoveredAmount,
      preventable: trend.preventableCount
    }));
  }, [denialData]);

  // Denial reasons breakdown
  const denialReasons = useMemo(() => {
    if (!denialData?.reasons) return [];
    
    return denialData.reasons.map(reason => ({
      name: reason.description,
      value: reason.count,
      percentage: reason.percentage,
      category: reason.category,
      isPreventable: reason.isPreventable
    }));
  }, [denialData]);

  // Provider performance data
  const providerPerformance = useMemo(() => {
    if (!denialData?.providerAnalysis) return [];
    
    return denialData.providerAnalysis
      .sort((a, b) => b.denialRate - a.denialRate)
      .slice(0, 10)
      .map(provider => ({
        name: provider.providerName,
        denialRate: provider.denialRate,
        denialCount: provider.denialCount,
        totalClaims: provider.totalClaims,
        improvement: provider.monthOverMonthChange
      }));
  }, [denialData]);

  // Payer analysis data
  const payerAnalysis = useMemo(() => {
    if (!denialData?.payerAnalysis) return [];
    
    return denialData.payerAnalysis.map(payer => ({
      name: payer.payerName,
      denialRate: payer.denialRate,
      avgDaysToResolve: payer.avgDaysToResolve,
      totalDenials: payer.totalDenials,
      topReason: payer.topDenialReason
    }));
  }, [denialData]);

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading denial analytics...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load denial analytics. Please try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Denial Analytics Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <IconButton onClick={() => refetch()}>
            <Refresh />
          </IconButton>
          <IconButton>
            <Download />
          </IconButton>
        </Box>
      </Box>

      {/* Filters */}
      <FilterPanel
        facilities={denialData?.filters.facilities}
        payers={denialData?.filters.payers}
        providers={denialData?.filters.providers}
        selectedFacility={selectedFacility}
        selectedPayer={selectedPayer}
        selectedProvider={selectedProvider}
        onFacilityChange={setSelectedFacility}
        onPayerChange={setSelectedPayer}
        onProviderChange={setSelectedProvider}
      />

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4} lg={2}>
          <KPICard
            title="Total Denials"
            value={kpiMetrics?.totalDenials || 0}
            format="number"
            trend={denialData?.summary.trendVsPrevious}
            icon={<Warning />}
            color="error"
          />
        </Grid>
        <Grid item xs={12} md={4} lg={2}>
          <KPICard
            title="Denial Rate"
            value={kpiMetrics?.denialRate || 0}
            format="percentage"
            target={5}
            trend={denialData?.summary.rateChange}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} md={4} lg={2}>
          <KPICard
            title="Appeal Success"
            value={kpiMetrics?.appealSuccessRate || 0}
            format="percentage"
            target={75}
            icon={<CheckCircle />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} md={4} lg={2}>
          <KPICard
            title="Avg Resolution Days"
            value={kpiMetrics?.avgOverturnTime || 0}
            format="days"
            target={15}
            trend={denialData?.summary.resolutionTrend}
          />
        </Grid>
        <Grid item xs={12} md={4} lg={2}>
          <KPICard
            title="Financial Impact"
            value={kpiMetrics?.financialImpact || 0}
            format="currency"
            trend={denialData?.summary.financialTrend}
            color="error"
          />
        </Grid>
        <Grid item xs={12} md={4} lg={2}>
          <KPICard
            title="Preventable %"
            value={kpiMetrics?.preventableDenials || 0}
            format="percentage"
            target={20}
            tooltip="Percentage of denials that could have been prevented"
          />
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Denial Trends */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Denial Trends & Recovery
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={denialTrends}>
                  <defs>
                    <linearGradient id="denialGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="recoveryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#51CF66" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#51CF66" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="denials"
                    stroke="#FF6B6B"
                    fillOpacity={1}
                    fill="url(#denialGradient)"
                    name="Denials"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="recovered"
                    stroke="#51CF66"
                    fillOpacity={1}
                    fill="url(#recoveryGradient)"
                    name="Recovered ($)"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="rate"
                    stroke="#FF9F40"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Denial Rate %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Denial Categories */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Denial Categories
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={denialReasons}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {denialReasons.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={DENIAL_CATEGORIES[entry.category] || '#95A5A6'} 
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Top Denial Reasons */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">
                  Top Denial Reasons
                </Typography>
                <Chip 
                  label={`${denialReasons.filter(r => r.isPreventable).length} Preventable`}
                  color="warning"
                  size="small"
                />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Reason</TableCell>
                      <TableCell align="center">Category</TableCell>
                      <TableCell align="right">Count</TableCell>
                      <TableCell align="right">%</TableCell>
                      <TableCell align="center">Preventable</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {denialReasons.slice(0, 10).map((reason, index) => (
                      <TableRow key={index}>
                        <TableCell>{reason.name}</TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={reason.category} 
                            size="small"
                            style={{ 
                              backgroundColor: alpha(DENIAL_CATEGORIES[reason.category] || '#95A5A6', 0.2),
                              color: DENIAL_CATEGORIES[reason.category] || '#95A5A6'
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">{reason.value}</TableCell>
                        <TableCell align="right">{reason.percentage}%</TableCell>
                        <TableCell align="center">
                          {reason.isPreventable ? (
                            <Warning color="warning" fontSize="small" />
                          ) : (
                            <CheckCircle color="success" fontSize="small" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Provider Performance */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Provider Denial Rates
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={providerPerformance} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <RechartsTooltip />
                  <Bar dataKey="denialRate" fill="#FF6B6B">
                    {providerPerformance.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.denialRate > 10 ? '#FF6B6B' : entry.denialRate > 5 ? '#FFA07A' : '#51CF66'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Payer Analysis */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payer Analysis
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Payer</TableCell>
                      <TableCell align="right">Denial Rate</TableCell>
                      <TableCell align="right">Total Denials</TableCell>
                      <TableCell align="right">Avg Days to Resolve</TableCell>
                      <TableCell>Top Denial Reason</TableCell>
                      <TableCell align="center">Trend</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payerAnalysis.map((payer, index) => (
                      <TableRow key={index}>
                        <TableCell>{payer.name}</TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={`${payer.denialRate}%`}
                            color={payer.denialRate > 10 ? 'error' : payer.denialRate > 5 ? 'warning' : 'success'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">{payer.totalDenials}</TableCell>
                        <TableCell align="right">{payer.avgDaysToResolve} days</TableCell>
                        <TableCell>{payer.topReason}</TableCell>
                        <TableCell align="center">
                          {payer.denialRate > denialData?.summary.avgDenialRate ? (
                            <TrendingUp color="error" />
                          ) : (
                            <TrendingDown color="success" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};