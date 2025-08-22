import { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  DoNotDisturb,
  TrendingUp,
  TrendingDown,
  Download,
  Visibility,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
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
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  Treemap,
} from 'recharts';
import MetricCard from '../components/Common/MetricCard';
import ChartCard from '../components/Common/ChartCard';

// Sample data
const denialMetrics = [
  {
    title: 'Total Denials',
    value: '$1.2M',
    change: '-8.5%',
    trend: 'down' as const,
    icon: <DoNotDisturb />,
    color: '#f44336',
  },
  {
    title: 'Denial Rate',
    value: '8.2%',
    change: '-1.3%',
    trend: 'down' as const,
    icon: <TrendingDown />,
    color: '#ff9800',
  },
  {
    title: 'Appeal Success',
    value: '78.5%',
    change: '+5.2%',
    trend: 'up' as const,
    icon: <CheckCircle />,
    color: '#4caf50',
  },
  {
    title: 'Avg Days to Appeal',
    value: '12.3',
    change: '-2.1 days',
    trend: 'down' as const,
    icon: <TrendingDown />,
    color: '#2196f3',
  },
];

const denialTrendData = [
  { month: 'Jan', denials: 145, rate: 9.5, appeals: 98, recovered: 76 },
  { month: 'Feb', denials: 132, rate: 9.1, appeals: 95, recovered: 74 },
  { month: 'Mar', denials: 128, rate: 8.8, appeals: 92, recovered: 73 },
  { month: 'Apr', denials: 118, rate: 8.5, appeals: 88, recovered: 70 },
  { month: 'May', denials: 112, rate: 8.3, appeals: 85, recovered: 68 },
  { month: 'Jun', denials: 105, rate: 8.2, appeals: 82, recovered: 66 },
];

const denialReasonData = [
  { reason: 'Authorization', count: 245, amount: 285000, percentage: 28 },
  { reason: 'Medical Necessity', count: 189, amount: 220000, percentage: 22 },
  { reason: 'Coding Errors', count: 156, amount: 180000, percentage: 18 },
  { reason: 'Eligibility', count: 134, amount: 155000, percentage: 15 },
  { reason: 'Timely Filing', count: 89, amount: 105000, percentage: 10 },
  { reason: 'Other', count: 62, amount: 75000, percentage: 7 },
];

const payerDenialData = [
  { name: 'Medicare', value: 320, color: '#0088FE' },
  { name: 'Medicaid', value: 180, color: '#00C49F' },
  { name: 'Blue Cross', value: 150, color: '#FFBB28' },
  { name: 'Aetna', value: 120, color: '#FF8042' },
  { name: 'United Health', value: 105, color: '#8884D8' },
];

const denialDetailsData = [
  {
    id: 'DN001234',
    patient: 'John Smith',
    payer: 'Medicare',
    serviceDate: '2024-01-15',
    amount: 2450.00,
    reason: 'Authorization',
    status: 'Appealed',
    daysOld: 15,
    priority: 'high',
  },
  {
    id: 'DN001235',
    patient: 'Mary Johnson',
    payer: 'Blue Cross',
    serviceDate: '2024-01-10',
    amount: 3200.00,
    reason: 'Medical Necessity',
    status: 'Pending Review',
    daysOld: 20,
    priority: 'medium',
  },
  {
    id: 'DN001236',
    patient: 'Robert Williams',
    payer: 'Aetna',
    serviceDate: '2023-12-28',
    amount: 1850.00,
    reason: 'Coding Errors',
    status: 'In Appeal',
    daysOld: 33,
    priority: 'high',
  },
  {
    id: 'DN001237',
    patient: 'Patricia Brown',
    payer: 'Medicaid',
    serviceDate: '2023-12-15',
    amount: 4100.00,
    reason: 'Eligibility',
    status: 'Resolved',
    daysOld: 46,
    priority: 'low',
  },
  {
    id: 'DN001238',
    patient: 'Michael Davis',
    payer: 'United Health',
    serviceDate: '2023-11-20',
    amount: 2750.00,
    reason: 'Timely Filing',
    status: 'Written Off',
    daysOld: 71,
    priority: 'low',
  },
];

const departmentDenialData = [
  { name: 'Emergency', value: 2400 },
  { name: 'Surgery', value: 1398 },
  { name: 'Radiology', value: 980 },
  { name: 'Laboratory', value: 850 },
  { name: 'Cardiology', value: 650 },
  { name: 'Orthopedics', value: 450 },
];

const DenialManagement = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Appealed': return 'primary';
      case 'Pending Review': return 'warning';
      case 'In Appeal': return 'info';
      case 'Resolved': return 'success';
      case 'Written Off': return 'error';
      default: return 'default';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <ErrorIcon color="error" fontSize="small" />;
      case 'medium': return <Warning color="warning" fontSize="small" />;
      case 'low': return <CheckCircle color="success" fontSize="small" />;
      default: return null;
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Box className="fade-in">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Denial Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Download />}
          sx={{ borderRadius: 2 }}
        >
          Export Report
        </Button>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {denialMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <MetricCard {...metric} />
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Overview" />
          <Tab label="Denial Reasons" />
          <Tab label="Payer Analysis" />
          <Tab label="Denial Details" />
        </Tabs>
      </Card>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <ChartCard title="Denial Trends" subtitle="Monthly denial metrics">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={denialTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <ChartTooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="denials" stroke="#8884d8" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="rate" stroke="#82ca9d" strokeWidth={2} />
                  <Bar yAxisId="left" dataKey="recovered" fill="#ffc658" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12} lg={4}>
            <ChartCard title="Department Distribution" subtitle="Denials by department">
              <ResponsiveContainer width="100%" height={350}>
                <Treemap
                  data={departmentDenialData}
                  dataKey="value"
                  aspectRatio={1}
                  stroke="#fff"
                  fill="#8884d8"
                >
                  <ChartTooltip />
                </Treemap>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <ChartCard title="Denial Reasons Analysis" subtitle="Top denial reasons and amounts">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={denialReasonData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <YAxis dataKey="reason" type="category" width={120} />
                  <ChartTooltip formatter={(value: number) => `$${(value / 1000).toFixed(1)}K`} />
                  <Legend />
                  <Bar dataKey="amount" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Reason Breakdown</Typography>
                {denialReasonData.map((reason, index) => (
                  <Box key={reason.reason} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">{reason.reason}</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {reason.count} ({reason.percentage}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={reason.percentage}
                      sx={{ height: 8, borderRadius: 4 }}
                      color={index === 0 ? 'error' : index === 1 ? 'warning' : 'primary'}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <ChartCard title="Denials by Payer" subtitle="Distribution of denials">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={payerDenialData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {payerDenialData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>Payer Performance</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Payer</TableCell>
                        <TableCell align="right">Denials</TableCell>
                        <TableCell align="right">Rate</TableCell>
                        <TableCell align="right">Appeal Success</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Medicare</TableCell>
                        <TableCell align="right">320</TableCell>
                        <TableCell align="right">7.8%</TableCell>
                        <TableCell align="right">82%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Medicaid</TableCell>
                        <TableCell align="right">180</TableCell>
                        <TableCell align="right">9.2%</TableCell>
                        <TableCell align="right">75%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Blue Cross</TableCell>
                        <TableCell align="right">150</TableCell>
                        <TableCell align="right">6.5%</TableCell>
                        <TableCell align="right">88%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Aetna</TableCell>
                        <TableCell align="right">120</TableCell>
                        <TableCell align="right">8.1%</TableCell>
                        <TableCell align="right">79%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>United Health</TableCell>
                        <TableCell align="right">105</TableCell>
                        <TableCell align="right">7.3%</TableCell>
                        <TableCell align="right">81%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>Denial Details</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Patient</TableCell>
                        <TableCell>Payer</TableCell>
                        <TableCell>Service Date</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Days Old</TableCell>
                        <TableCell align="center">Priority</TableCell>
                        <TableCell align="center">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {denialDetailsData.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>{row.id}</TableCell>
                          <TableCell>{row.patient}</TableCell>
                          <TableCell>{row.payer}</TableCell>
                          <TableCell>{row.serviceDate}</TableCell>
                          <TableCell align="right">${row.amount.toFixed(2)}</TableCell>
                          <TableCell>{row.reason}</TableCell>
                          <TableCell>
                            <Chip
                              label={row.status}
                              color={getStatusColor(row.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">{row.daysOld}</TableCell>
                          <TableCell align="center">
                            <Tooltip title={`${row.priority} priority`}>
                              {getPriorityIcon(row.priority)}
                            </Tooltip>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small">
                              <Visibility fontSize="small" />
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
      )}
    </Box>
  );
};

export default DenialManagement;