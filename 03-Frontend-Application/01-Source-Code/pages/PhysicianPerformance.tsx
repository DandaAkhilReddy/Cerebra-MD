// =============================================================================
// Physician Performance Dashboard
// Cerebra-MD Healthcare Analytics Platform
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Avatar,
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
  Rating,
  Stack,
  Button,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Person,
  Download,
  Refresh,
  Star,
  CheckCircle,
  Warning,
  MoreVert,
  LocalHospital,
  AttachMoney,
  AccessTime,
  Assignment
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { providerService } from '../services/api';
import { KPICard } from '../components/KPICard';
import { DateRangePicker } from '../components/DateRangePicker';
import { MetricCard } from '../components/MetricCard';

// Performance rating colors
const getRatingColor = (rating: number) => {
  if (rating >= 4.5) return '#51CF66';
  if (rating >= 3.5) return '#45B7D1';
  if (rating >= 2.5) return '#FFA07A';
  return '#FF6B6B';
};

export const PhysicianPerformance: React.FC = () => {
  const theme = useTheme();
  const [dateRange, setDateRange] = useState({ start: '2025-01-01', end: '2025-01-31' });
  const [selectedFacility, setSelectedFacility] = useState('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  // Fetch physician performance data
  const { data: performanceData, isLoading, error, refetch } = useQuery({
    queryKey: ['physicianPerformance', dateRange, selectedFacility, selectedSpecialty],
    queryFn: () => providerService.getProviderPerformance({
      startDate: dateRange.start,
      endDate: dateRange.end,
      facilityId: selectedFacility,
      specialty: selectedSpecialty
    }),
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  // Overall performance metrics
  const overallMetrics = useMemo(() => {
    if (!performanceData) return null;
    
    return {
      totalProviders: performanceData.summary.totalProviders,
      avgProductivity: performanceData.summary.avgProductivityScore,
      avgQualityScore: performanceData.summary.avgQualityScore,
      totalRevenue: performanceData.summary.totalRevenue,
      avgEncountersPerDay: performanceData.summary.avgEncountersPerDay,
      topPerformer: performanceData.summary.topPerformer
    };
  }, [performanceData]);

  // Provider rankings
  const providerRankings = useMemo(() => {
    if (!performanceData?.providers) return [];
    
    return performanceData.providers
      .map(provider => ({
        id: provider.id,
        name: provider.name,
        specialty: provider.specialty,
        facility: provider.facility,
        productivityScore: provider.productivityScore,
        qualityScore: provider.qualityScore,
        overallRating: provider.overallRating,
        encounters: provider.totalEncounters,
        revenue: provider.totalRevenue,
        avgTimePerEncounter: provider.avgTimePerEncounter,
        denialRate: provider.denialRate,
        patientSatisfaction: provider.patientSatisfaction,
        trend: provider.monthOverMonthChange
      }))
      .sort((a, b) => b.overallRating - a.overallRating);
  }, [performanceData]);

  // Performance trends
  const performanceTrends = useMemo(() => {
    if (!performanceData?.trends) return [];
    
    return performanceData.trends.map(trend => ({
      month: trend.month,
      productivity: trend.avgProductivity,
      quality: trend.avgQuality,
      revenue: trend.totalRevenue,
      encounters: trend.totalEncounters
    }));
  }, [performanceData]);

  // Specialty comparison
  const specialtyComparison = useMemo(() => {
    if (!performanceData?.specialtyAnalysis) return [];
    
    return performanceData.specialtyAnalysis.map(spec => ({
      specialty: spec.specialty,
      avgProductivity: spec.avgProductivity,
      avgQuality: spec.avgQuality,
      avgRevenue: spec.avgRevenuePerProvider,
      providerCount: spec.providerCount
    }));
  }, [performanceData]);

  // Individual provider metrics (for radar chart)
  const getProviderRadarData = (providerId: string) => {
    const provider = performanceData?.providers.find(p => p.id === providerId);
    if (!provider) return [];

    return [
      { metric: 'Productivity', value: provider.productivityScore, max: 100 },
      { metric: 'Quality', value: provider.qualityScore, max: 100 },
      { metric: 'Efficiency', value: provider.efficiencyScore, max: 100 },
      { metric: 'Patient Satisfaction', value: provider.patientSatisfaction, max: 100 },
      { metric: 'Documentation', value: provider.documentationScore, max: 100 },
      { metric: 'Compliance', value: provider.complianceScore, max: 100 }
    ];
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading physician performance data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load physician performance data. Please try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Physician Performance Dashboard
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

      {/* Top Performer Alert */}
      {overallMetrics?.topPerformer && (
        <Alert 
          severity="success" 
          icon={<Star />}
          sx={{ mb: 3 }}
        >
          <strong>{overallMetrics.topPerformer.name}</strong> is this month's top performer with an overall rating of {overallMetrics.topPerformer.rating}/5!
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4} lg={2}>
          <KPICard
            title="Total Providers"
            value={overallMetrics?.totalProviders || 0}
            format="number"
            icon={<Person />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} md={4} lg={2}>
          <KPICard
            title="Avg Productivity"
            value={overallMetrics?.avgProductivity || 0}
            format="score"
            target={85}
            trend={performanceData?.summary.productivityTrend}
            color="success"
          />
        </Grid>
        <Grid item xs={12} md={4} lg={2}>
          <KPICard
            title="Avg Quality Score"
            value={overallMetrics?.avgQualityScore || 0}
            format="score"
            target={90}
            trend={performanceData?.summary.qualityTrend}
            color="info"
          />
        </Grid>
        <Grid item xs={12} md={4} lg={2}>
          <KPICard
            title="Total Revenue"
            value={overallMetrics?.totalRevenue || 0}
            format="currency"
            trend={performanceData?.summary.revenueTrend}
            icon={<AttachMoney />}
          />
        </Grid>
        <Grid item xs={12} md={4} lg={2}>
          <KPICard
            title="Avg Encounters/Day"
            value={overallMetrics?.avgEncountersPerDay || 0}
            format="decimal"
            target={15}
            icon={<Assignment />}
          />
        </Grid>
        <Grid item xs={12} md={4} lg={2}>
          <MetricCard
            title="Top Specialty"
            value={performanceData?.summary.topSpecialty || 'N/A'}
            subtitle="By productivity"
            icon={<LocalHospital />}
          />
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Performance Trends */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Trends
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={performanceTrends}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#45B7D1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#45B7D1" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip />
                  <Legend />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#45B7D1"
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                    name="Revenue ($)"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="productivity"
                    stroke="#51CF66"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    name="Productivity Score"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="quality"
                    stroke="#FFA07A"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    name="Quality Score"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Specialty Comparison */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Specialty Performance
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={specialtyComparison.slice(0, 6)}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="specialty" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar 
                    name="Productivity" 
                    dataKey="avgProductivity" 
                    stroke="#51CF66" 
                    fill="#51CF66" 
                    fillOpacity={0.6} 
                  />
                  <Radar 
                    name="Quality" 
                    dataKey="avgQuality" 
                    stroke="#45B7D1" 
                    fill="#45B7D1" 
                    fillOpacity={0.6} 
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Provider Rankings Table */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Provider Rankings
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>Provider</TableCell>
                      <TableCell>Specialty</TableCell>
                      <TableCell align="center">Overall Rating</TableCell>
                      <TableCell align="right">Productivity</TableCell>
                      <TableCell align="right">Quality</TableCell>
                      <TableCell align="right">Encounters</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                      <TableCell align="right">Denial Rate</TableCell>
                      <TableCell align="center">Trend</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {providerRankings.slice(0, 10).map((provider, index) => (
                      <TableRow 
                        key={provider.id}
                        sx={{ 
                          backgroundColor: index === 0 ? alpha(theme.palette.success.main, 0.1) : 'transparent',
                          '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.05) }
                        }}
                      >
                        <TableCell>
                          <Chip 
                            label={`#${index + 1}`}
                            size="small"
                            color={index === 0 ? 'success' : index < 3 ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32 }}>
                              {provider.name.split(' ').map(n => n[0]).join('')}
                            </Avatar>
                            <Typography variant="body2">{provider.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{provider.specialty}</TableCell>
                        <TableCell align="center">
                          <Rating 
                            value={provider.overallRating} 
                            readOnly 
                            size="small"
                            sx={{ color: getRatingColor(provider.overallRating) }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={provider.productivityScore}
                            size="small"
                            color={provider.productivityScore >= 85 ? 'success' : provider.productivityScore >= 70 ? 'warning' : 'error'}
                          />
                        </TableCell>
                        <TableCell align="right">{provider.qualityScore}</TableCell>
                        <TableCell align="right">{provider.encounters}</TableCell>
                        <TableCell align="right">${provider.revenue.toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            color={provider.denialRate > 10 ? 'error' : provider.denialRate > 5 ? 'warning' : 'success'}
                          >
                            {provider.denialRate}%
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {provider.trend > 0 ? (
                            <TrendingUp color="success" />
                          ) : provider.trend < 0 ? (
                            <TrendingDown color="error" />
                          ) : '-'}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              setAnchorEl(e.currentTarget);
                              setSelectedProvider(provider);
                            }}
                          >
                            <MoreVert />
                          </IconButton>
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

      {/* Individual Provider Analysis */}
      {selectedProvider && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {selectedProvider.name} - Performance Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={getProviderRadarData(selectedProvider.id)}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar 
                      name="Score" 
                      dataKey="value" 
                      stroke="#45B7D1" 
                      fill="#45B7D1" 
                      fillOpacity={0.6} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Key Metrics
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Average Time per Encounter</Typography>
                    <Typography fontWeight="bold">{selectedProvider.avgTimePerEncounter} min</Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Patient Satisfaction</Typography>
                    <Rating value={selectedProvider.patientSatisfaction / 20} readOnly size="small" />
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Revenue per Encounter</Typography>
                    <Typography fontWeight="bold">
                      ${(selectedProvider.revenue / selectedProvider.encounters).toFixed(2)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          // View detailed report
          setAnchorEl(null);
        }}>
          View Detailed Report
        </MenuItem>
        <MenuItem onClick={() => {
          // Compare with peers
          setAnchorEl(null);
        }}>
          Compare with Peers
        </MenuItem>
        <MenuItem onClick={() => {
          // Export data
          setAnchorEl(null);
        }}>
          Export Performance Data
        </MenuItem>
      </Menu>
    </Box>
  );
};