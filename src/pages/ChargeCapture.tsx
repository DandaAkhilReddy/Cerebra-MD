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
  Chip,
  Button,
  LinearProgress,
  IconButton,
  Avatar,
} from '@mui/material';
import {
  Receipt,
  TrendingUp,
  TrendingDown,
  Download,
  Visibility,
  Speed,
  Schedule,
  AttachMoney,
  Assignment,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import MetricCard from '../components/Common/MetricCard';
import ChartCard from '../components/Common/ChartCard';

// Sample data
const chargeMetrics = [
  {
    title: 'Total Charges',
    value: '$3.2M',
    change: '+15.2%',
    trend: 'up' as const,
    icon: <AttachMoney />,
    color: '#4caf50',
  },
  {
    title: 'Days to Bill',
    value: '2.8',
    change: '-0.5 days',
    trend: 'down' as const,
    icon: <Speed />,
    color: '#2196f3',
  },
  {
    title: 'Charge Lag',
    value: '4.2%',
    change: '-1.1%',
    trend: 'down' as const,
    icon: <Schedule />,
    color: '#ff9800',
  },
  {
    title: 'Capture Rate',
    value: '97.8%',
    change: '+2.3%',
    trend: 'up' as const,
    icon: <Receipt />,
    color: '#9c27b0',
  },
];

const chargeTrendData = [
  { month: 'Jan', charges: 2800000, billed: 2650000, pending: 150000 },
  { month: 'Feb', charges: 2950000, billed: 2820000, pending: 130000 },
  { month: 'Mar', charges: 3100000, billed: 2980000, pending: 120000 },
  { month: 'Apr', charges: 3250000, billed: 3140000, pending: 110000 },
  { month: 'May', charges: 3180000, billed: 3080000, pending: 100000 },
  { month: 'Jun', charges: 3200000, billed: 3120000, pending: 80000 },
];

const departmentChargeData = [
  { department: 'Emergency', charges: 850000, capture: 98.5, avgDays: 2.1 },
  { department: 'Surgery', charges: 720000, capture: 97.2, avgDays: 2.8 },
  { department: 'ICU', charges: 650000, capture: 99.1, avgDays: 1.9 },
  { department: 'Radiology', charges: 480000, capture: 96.8, avgDays: 3.2 },
  { department: 'Laboratory', charges: 380000, capture: 98.9, avgDays: 1.5 },
  { department: 'Cardiology', charges: 320000, capture: 97.5, avgDays: 2.6 },
  { department: 'Orthopedics', charges: 280000, capture: 96.3, avgDays: 3.8 },
];

const providerPerformanceData = [
  { name: 'Dr. Smith', charges: 450000, capture: 98.5, avgDays: 2.2 },
  { name: 'Dr. Johnson', charges: 420000, capture: 97.8, avgDays: 2.8 },
  { name: 'Dr. Williams', charges: 380000, capture: 99.2, avgDays: 1.9 },
  { name: 'Dr. Brown', charges: 350000, capture: 96.5, avgDays: 3.5 },
  { name: 'Dr. Davis', charges: 320000, capture: 98.1, avgDays: 2.4 },
];

const chargeDetailsData = [
  {
    id: 'CH001234',
    patient: 'John Smith',
    provider: 'Dr. Johnson',
    department: 'Emergency',
    dos: '2024-01-20',
    amount: 2850.00,
    status: 'Billed',
    daysToCapture: 2,
    coder: 'Alice Cooper',
  },
  {
    id: 'CH001235',
    patient: 'Mary Johnson',
    provider: 'Dr. Williams',
    department: 'Surgery',
    dos: '2024-01-18',
    amount: 12500.00,
    status: 'Pending Review',
    daysToCapture: 4,
    coder: 'Bob Wilson',
  },
  {
    id: 'CH001236',
    patient: 'Robert Wilson',
    provider: 'Dr. Brown',
    department: 'ICU',
    dos: '2024-01-15',
    amount: 8900.00,
    status: 'In Progress',
    daysToCapture: 7,
    coder: 'Carol Smith',
  },
  {
    id: 'CH001237',
    patient: 'Patricia Davis',
    provider: 'Dr. Smith',
    department: 'Radiology',
    dos: '2024-01-12',
    amount: 1200.00,
    status: 'Completed',
    daysToCapture: 1,
    coder: 'David Lee',
  },
];

const lagAnalysisData = [
  { range: '0-1 days', count: 1250, percentage: 65 },
  { range: '2-3 days', count: 480, percentage: 25 },
  { range: '4-7 days', count: 150, percentage: 8 },
  { range: '8-14 days', count: 30, percentage: 1.5 },
  { range: '15+ days', count: 10, percentage: 0.5 },
];

const ChargeCapture = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'Billed': return 'primary';
      case 'In Progress': return 'warning';
      case 'Pending Review': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box className="fade-in">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Charge Capture
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
        {chargeMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <MetricCard {...metric} />
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Overview" />
          <Tab label="Department Analysis" />
          <Tab label="Provider Performance" />
          <Tab label="Charge Details" />
        </Tabs>
      </Card>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <ChartCard title="Charge Capture Trends" subtitle="Monthly charge and billing patterns">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chargeTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(value: number) => `$${(value / 1000000).toFixed(2)}M`} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="charges"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="billed"
                    stackId="2"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="pending"
                    stackId="2"
                    stroke="#ffc658"
                    fill="#ffc658"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>Charge Lag Analysis</Typography>
                {lagAnalysisData.map((item, index) => (
                  <Box key={item.range} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">{item.range}</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {item.count} ({item.percentage}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={item.percentage}
                      sx={{ height: 8, borderRadius: 4 }}
                      color={index === 0 ? 'success' : index === 1 ? 'primary' : 'warning'}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <ChartCard title="Department Performance" subtitle="Charge capture by department">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={departmentChargeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" angle={-45} textAnchor="end" height={100} />
                  <YAxis yAxisId="left" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <YAxis yAxisId="right" orientation="right" domain={[95, 100]} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'charges') return `$${(value / 1000).toFixed(1)}K`;
                      if (name === 'capture') return `${value}%`;
                      return `${value} days`;
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="charges" fill="#8884d8" />
                  <Line yAxisId="right" type="monotone" dataKey="capture" stroke="#ff7300" strokeWidth={3} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>Department Details</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Department</TableCell>
                        <TableCell align="right">Total Charges</TableCell>
                        <TableCell align="right">Capture Rate</TableCell>
                        <TableCell align="right">Avg Days</TableCell>
                        <TableCell align="center">Performance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {departmentChargeData.map((row) => (
                        <TableRow key={row.department}>
                          <TableCell>{row.department}</TableCell>
                          <TableCell align="right">${(row.charges / 1000).toFixed(0)}K</TableCell>
                          <TableCell align="right">{row.capture}%</TableCell>
                          <TableCell align="right">{row.avgDays}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={row.capture >= 98 ? 'Excellent' : row.capture >= 97 ? 'Good' : 'Needs Improvement'}
                              color={row.capture >= 98 ? 'success' : row.capture >= 97 ? 'primary' : 'warning'}
                              size="small"
                            />
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

      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <ChartCard title="Provider Performance" subtitle="Charge capture efficiency by provider">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={providerPerformanceData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(value: number) => `$${(value / 1000).toFixed(1)}K`} />
                  <Bar dataKey="charges" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>Provider Details</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Provider</TableCell>
                        <TableCell align="right">Total Charges</TableCell>
                        <TableCell align="right">Capture Rate</TableCell>
                        <TableCell align="right">Avg Days</TableCell>
                        <TableCell align="center">Efficiency</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {providerPerformanceData.map((row) => (
                        <TableRow key={row.name}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 32, height: 32 }}>
                                {row.name.split(' ').map(n => n[0]).join('')}
                              </Avatar>
                              {row.name}
                            </Box>
                          </TableCell>
                          <TableCell align="right">${(row.charges / 1000).toFixed(0)}K</TableCell>
                          <TableCell align="right">{row.capture}%</TableCell>
                          <TableCell align="right">{row.avgDays}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={row.capture >= 98 ? 'High' : row.capture >= 97 ? 'Medium' : 'Low'}
                              color={row.capture >= 98 ? 'success' : row.capture >= 97 ? 'primary' : 'warning'}
                              size="small"
                            />
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

      {tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>Recent Charges</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Charge ID</TableCell>
                        <TableCell>Patient</TableCell>
                        <TableCell>Provider</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell>DOS</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Days</TableCell>
                        <TableCell>Coder</TableCell>
                        <TableCell align="center">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {chargeDetailsData.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>{row.id}</TableCell>
                          <TableCell>{row.patient}</TableCell>
                          <TableCell>{row.provider}</TableCell>
                          <TableCell>{row.department}</TableCell>
                          <TableCell>{row.dos}</TableCell>
                          <TableCell align="right">${row.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Chip
                              label={row.status}
                              color={getStatusColor(row.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">{row.daysToCapture}</TableCell>
                          <TableCell>{row.coder}</TableCell>
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

export default ChargeCapture;