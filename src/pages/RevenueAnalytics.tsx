// =============================================================================
// Revenue Analytics Dashboard
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
  alpha,
  ToggleButton,
  ToggleButtonGroup,
  Stack
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Download,
  Refresh,
  ShowChart,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  People,
  LocalHospital,
  CalendarMonth
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Treemap,
  Sankey,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { revenueService } from '../services/api';
import { KPICard } from '../components/KPICard';
import { DateRangePicker } from '../components/DateRangePicker';
import { PredictiveModel } from '../components/PredictiveModel';

// Color palette for charts
const COLORS = ['#45B7D1', '#51CF66', '#FFA07A', '#FF6B6B', '#98D8C8', '#FDCB6E', '#6C5CE7', '#A29BFE'];

export const RevenueAnalytics: React.FC = () => {
  const theme = useTheme();
  const [dateRange, setDateRange] = useState({ start: '2025-01-01', end: '2025-01-31' });
  const [selectedFacility, setSelectedFacility] = useState('all');
  const [selectedPayer, setSelectedPayer] = useState('all');
  const [viewMode, setViewMode] = useState('actual');
  const [chartType, setChartType] = useState('trend');

  // Fetch revenue data
  const { data: revenueData, isLoading, error, refetch } = useQuery({
    queryKey: ['revenueAnalytics', dateRange, selectedFacility, selectedPayer, viewMode],
    queryFn: () => revenueService.getRevenueAnalytics({
      startDate: dateRange.start,
      endDate: dateRange.end,
      facilityId: selectedFacility,
      payerId: selectedPayer,
      includeProjections: viewMode === 'predicted'
    }),
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  // Calculate KPI metrics
  const kpiMetrics = useMemo(() => {
    if (!revenueData) return null;
    
    return {
      totalRevenue: revenueData.summary.totalRevenue,
      netRevenue: revenueData.summary.netRevenue,
      collectionRate: revenueData.summary.collectionRate,
      avgRevenuePerEncounter: revenueData.summary.avgRevenuePerEncounter,
      monthOverMonth: revenueData.summary.monthOverMonthGrowth,
      projectedRevenue: revenueData.summary.projectedRevenue
    };
  }, [revenueData]);

  // Revenue trends data
  const revenueTrends = useMemo(() => {
    if (!revenueData?.trends) return [];
    
    return revenueData.trends.map(trend => ({
      date: trend.date,
      grossRevenue: trend.grossRevenue,
      netRevenue: trend.netRevenue,
      collections: trend.collections,
      adjustments: trend.adjustments,
      predictedRevenue: trend.predictedRevenue,
      census: trend.census
    }));
  }, [revenueData]);

  // Revenue by payer mix
  const payerMixData = useMemo(() => {
    if (!revenueData?.payerMix) return [];
    
    return revenueData.payerMix.map(payer => ({
      name: payer.payerName,
      value: payer.revenue,
      percentage: payer.percentage,
      avgReimbursement: payer.avgReimbursementRate,
      volume: payer.claimVolume
    }));
  }, [revenueData]);

  // Revenue by service line
  const serviceLineData = useMemo(() => {
    if (!revenueData?.serviceLines) return [];
    
    return revenueData.serviceLines.map(service => ({
      name: service.serviceLine,
      revenue: service.revenue,
      volume: service.encounterVolume,
      avgRevenue: service.avgRevenuePerEncounter,
      growth: service.yearOverYearGrowth
    }));
  }, [revenueData]);

  // Census-based revenue prediction
  const censusPrediction = useMemo(() => {
    if (!revenueData?.censusPrediction) return [];
    
    return revenueData.censusPrediction.map(pred => ({
      census: pred.censusCount,
      actualRevenue: pred.actualRevenue,
      predictedRevenue: pred.predictedRevenue,
      variance: pred.variance,
      confidence: pred.confidenceInterval
    }));
  }, [revenueData]);

  // Delayed bills analysis
  const delayedBills = useMemo(() => {
    if (!revenueData?.delayedBills) return [];
    
    return revenueData.delayedBills.map(bill => ({
      category: bill.delayCategory,
      count: bill.billCount,
      value: bill.totalValue,
      avgDaysDelayed: bill.avgDaysDelayed,
      impact: bill.revenueImpact
    }));
  }, [revenueData]);

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading revenue analytics...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load revenue analytics. Please try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Revenue Analytics Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="actual">
              <ShowChart sx={{ mr: 1 }} />
              Actual
            </ToggleButton>
            <ToggleButton value="predicted">
              <ShowChart sx={{ mr: 1 }} />
              Predicted
            </ToggleButton>
          </ToggleButtonGroup>
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
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Facility</InputLabel>
            <Select
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              label="Facility"
            >
              <MenuItem value="all">All Facilities</MenuItem>
              {revenueData?.filters.facilities.map(facility => (
                <MenuItem key={facility.id} value={facility.id}>
                  {facility.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Payer</InputLabel>
            <Select
              value={selectedPayer}
              onChange={(e) => setSelectedPayer(e.target.value)}
              label="Payer"
            >
              <MenuItem value="all">All Payers</MenuItem>
              {revenueData?.filters.payers.map(payer => (
                <MenuItem key={payer.id} value={payer.id}>
                  {payer.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4} lg={2}>
          <KPICard
            title="Total Revenue"
            value={kpiMetrics?.totalRevenue || 0}
            format="currency"
            trend={kpiMetrics?.monthOverMonth}
            icon={<AttachMoney />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} md={4} lg={2}>
          <KPICard
            title="Net Revenue"
            value={kpiMetrics?.netRevenue || 0}
            format="currency"
            subtitle="After adjustments"
            trend={revenueData?.summary.netRevenueTrend}
            color="success"
          />
        </Grid>
        <Grid item xs={12} md={4} lg={2}>
          <KPICard
            title="Collection Rate"
            value={kpiMetrics?.collectionRate || 0}
            format="percentage"
            target={95}
            trend={revenueData?.summary.collectionTrend}
          />
        </Grid>
        <Grid item xs={12} md={4} lg={2}>
          <KPICard
            title="Avg Revenue/Encounter"
            value={kpiMetrics?.avgRevenuePerEncounter || 0}
            format="currency"
            trend={revenueData?.summary.avgRevenueTrend}
            icon={<LocalHospital />}
          />
        </Grid>
        <Grid item xs={12} md={4} lg={2}>
          <KPICard
            title="Projected Revenue"
            value={kpiMetrics?.projectedRevenue || 0}
            format="currency"
            subtitle="Next 30 days"
            color="info"
          />
        </Grid>
        <Grid item xs={12} md={4} lg={2}>
          <KPICard
            title="YoY Growth"
            value={revenueData?.summary.yearOverYearGrowth || 0}
            format="percentage"
            trend={revenueData?.summary.yearOverYearGrowth}
            color={revenueData?.summary.yearOverYearGrowth > 0 ? 'success' : 'error'}
          />
        </Grid>
      </Grid>

      {/* Revenue Trends Chart */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">
                  Revenue Trends & Predictions
                </Typography>
                <ToggleButtonGroup
                  value={chartType}
                  exclusive
                  onChange={(e, newType) => newType && setChartType(newType)}
                  size="small"
                >
                  <ToggleButton value="trend">
                    <ShowChart />
                  </ToggleButton>
                  <ToggleButton value="bar">
                    <BarChartIcon />
                  </ToggleButton>
                  <ToggleButton value="area">
                    <PieChartIcon />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <ResponsiveContainer width="100%" height={400}>
                {chartType === 'area' ? (
                  <AreaChart data={revenueTrends}>
                    <defs>
                      <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#45B7D1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#45B7D1" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#51CF66" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#51CF66" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FFA07A" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#FFA07A" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="grossRevenue"
                      stackId="1"
                      stroke="#45B7D1"
                      fillOpacity={1}
                      fill="url(#grossGradient)"
                      name="Gross Revenue"
                    />
                    <Area
                      type="monotone"
                      dataKey="netRevenue"
                      stackId="2"
                      stroke="#51CF66"
                      fillOpacity={1}
                      fill="url(#netGradient)"
                      name="Net Revenue"
                    />
                    {viewMode === 'predicted' && (
                      <Area
                        type="monotone"
                        dataKey="predictedRevenue"
                        stroke="#FFA07A"
                        fillOpacity={1}
                        fill="url(#predictedGradient)"
                        name="Predicted Revenue"
                        strokeDasharray="5 5"
                      />
                    )}
                  </AreaChart>
                ) : chartType === 'bar' ? (
                  <ComposedChart data={revenueTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <RechartsTooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="grossRevenue" fill="#45B7D1" name="Gross Revenue" />
                    <Bar yAxisId="left" dataKey="collections" fill="#51CF66" name="Collections" />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="census"
                      stroke="#FF6B6B"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      name="Census Count"
                    />
                  </ComposedChart>
                ) : (
                  <LineChart data={revenueTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="grossRevenue"
                      stroke="#45B7D1"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      name="Gross Revenue"
                    />
                    <Line
                      type="monotone"
                      dataKey="netRevenue"
                      stroke="#51CF66"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      name="Net Revenue"
                    />
                    <Line
                      type="monotone"
                      dataKey="collections"
                      stroke="#98D8C8"
                      strokeWidth={2}
                      name="Collections"
                    />
                    {viewMode === 'predicted' && (
                      <Line
                        type="monotone"
                        dataKey="predictedRevenue"
                        stroke="#FFA07A"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        name="Predicted Revenue"
                      />
                    )}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Row 2: Payer Mix and Service Lines */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Payer Mix */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Revenue by Payer Mix
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={payerMixData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {payerMixData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ mt: 2 }}>
                {payerMixData.slice(0, 3).map((payer, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          backgroundColor: COLORS[index],
                          borderRadius: '50%'
                        }}
                      />
                      {payer.name}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      ${payer.value.toLocaleString()} ({payer.percentage}%)
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Service Lines */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Revenue by Service Line
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={serviceLineData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <RechartsTooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="#45B7D1">
                    {serviceLineData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.growth > 0 ? '#51CF66' : '#FF6B6B'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Census-Based Revenue Prediction */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Census-Based Revenue Prediction Model
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="census" name="Census Count" />
                  <YAxis name="Revenue" />
                  <RechartsTooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Scatter 
                    name="Actual Revenue" 
                    data={censusPrediction} 
                    fill="#45B7D1"
                    dataKey="actualRevenue"
                  />
                  <Scatter 
                    name="Predicted Revenue" 
                    data={censusPrediction} 
                    fill="#FFA07A"
                    dataKey="predictedRevenue"
                    shape="triangle"
                  />
                </ScatterChart>
              </ResponsiveContainer>
              <Box sx={{ mt: 2 }}>
                <Alert severity="info">
                  Model Accuracy: {revenueData?.censusPrediction?.modelAccuracy || 95}% | 
                  R² Score: {revenueData?.censusPrediction?.rSquared || 0.92}
                </Alert>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Delayed Bills Analysis */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Delayed Bills Impact Analysis
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Delay Category</TableCell>
                      <TableCell align="right">Bill Count</TableCell>
                      <TableCell align="right">Total Value</TableCell>
                      <TableCell align="right">Avg Days Delayed</TableCell>
                      <TableCell align="right">Revenue Impact</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {delayedBills.map((bill, index) => (
                      <TableRow key={index}>
                        <TableCell>{bill.category}</TableCell>
                        <TableCell align="right">{bill.count}</TableCell>
                        <TableCell align="right">${bill.value.toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={`${bill.avgDaysDelayed} days`}
                            size="small"
                            color={bill.avgDaysDelayed > 30 ? 'error' : bill.avgDaysDelayed > 15 ? 'warning' : 'success'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography color="error">
                            -${bill.impact.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {bill.avgDaysDelayed > 30 ? (
                            <Chip label="Critical" color="error" size="small" />
                          ) : bill.avgDaysDelayed > 15 ? (
                            <Chip label="Warning" color="warning" size="small" />
                          ) : (
                            <Chip label="Normal" color="success" size="small" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ mt: 2 }}>
                <Alert severity="warning">
                  Total Revenue at Risk: ${revenueData?.delayedBills?.totalRevenueAtRisk?.toLocaleString() || 0}
                </Alert>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};