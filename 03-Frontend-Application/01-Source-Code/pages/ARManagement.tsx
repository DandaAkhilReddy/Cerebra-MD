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
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Search,
  Download,
  FilterList,
  TrendingUp,
  TrendingDown,
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
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import MetricCard from '../components/Common/MetricCard';
import ChartCard from '../components/Common/ChartCard';

// Sample data
const arAgingData = [
  { range: '0-30', amount: 2450000, percentage: 35, count: 1234 },
  { range: '31-60', amount: 1680000, percentage: 24, count: 892 },
  { range: '61-90', amount: 1120000, percentage: 16, count: 654 },
  { range: '91-120', amount: 840000, percentage: 12, count: 421 },
  { range: '121-150', amount: 560000, percentage: 8, count: 298 },
  { range: '150+', amount: 350000, percentage: 5, count: 187 },
];

const arTrendData = [
  { month: 'Jan', total: 6.2, current: 5.8, overdue: 0.4 },
  { month: 'Feb', total: 6.5, current: 6.0, overdue: 0.5 },
  { month: 'Mar', total: 6.8, current: 6.2, overdue: 0.6 },
  { month: 'Apr', total: 7.0, current: 6.5, overdue: 0.5 },
  { month: 'May', total: 6.9, current: 6.4, overdue: 0.5 },
  { month: 'Jun', total: 7.0, current: 6.6, overdue: 0.4 },
];

const payerARData = [
  { payer: 'Medicare', amount: 2100000, days: 42, trend: 'down' },
  { payer: 'Medicaid', amount: 1450000, days: 58, trend: 'up' },
  { payer: 'Blue Cross', amount: 1890000, days: 38, trend: 'down' },
  { payer: 'Aetna', amount: 980000, days: 45, trend: 'down' },
  { payer: 'United Health', amount: 1200000, days: 40, trend: 'up' },
  { payer: 'Cigna', amount: 750000, days: 52, trend: 'down' },
  { payer: 'Self Pay', amount: 430000, days: 95, trend: 'up' },
  { payer: 'Other', amount: 200000, days: 65, trend: 'down' },
];

const accountsData = [
  {
    id: 'ACC001234',
    patient: 'John Smith',
    payer: 'Medicare',
    dos: '2024-01-15',
    amount: 2450.00,
    age: 45,
    status: 'In Progress',
    lastAction: 'Claim submitted',
  },
  {
    id: 'ACC001235',
    patient: 'Mary Johnson',
    payer: 'Blue Cross',
    dos: '2024-01-10',
    amount: 3200.00,
    age: 52,
    status: 'Pending',
    lastAction: 'Authorization pending',
  },
  {
    id: 'ACC001236',
    patient: 'Robert Williams',
    payer: 'Aetna',
    dos: '2023-12-28',
    amount: 1850.00,
    age: 68,
    status: 'Follow-up',
    lastAction: 'Payment posted partial',
  },
  {
    id: 'ACC001237',
    patient: 'Patricia Brown',
    payer: 'Medicaid',
    dos: '2023-12-15',
    amount: 4100.00,
    age: 82,
    status: 'Review',
    lastAction: 'Denial received',
  },
  {
    id: 'ACC001238',
    patient: 'Michael Davis',
    payer: 'United Health',
    dos: '2023-11-20',
    amount: 2750.00,
    age: 105,
    status: 'Collections',
    lastAction: 'Sent to collections',
  },
];

const ARManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayer, setFilterPayer] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress': return 'primary';
      case 'Pending': return 'warning';
      case 'Follow-up': return 'info';
      case 'Review': return 'secondary';
      case 'Collections': return 'error';
      default: return 'default';
    }
  };

  const metrics = [
    {
      title: 'Total A/R',
      value: '$7.0M',
      change: '+2.1%',
      trend: 'up' as const,
      icon: <TrendingUp />,
      color: '#1976d2',
    },
    {
      title: 'Current (0-30)',
      value: '$2.45M',
      change: '35%',
      trend: 'up' as const,
      icon: <TrendingUp />,
      color: '#4caf50',
    },
    {
      title: 'Overdue (>90)',
      value: '$1.75M',
      change: '25%',
      trend: 'down' as const,
      icon: <TrendingDown />,
      color: '#f44336',
    },
    {
      title: 'Average Days',
      value: '48.5',
      change: '-2.5 days',
      trend: 'down' as const,
      icon: <TrendingDown />,
      color: '#ff9800',
    },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  return (
    <Box className="fade-in">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          A/R Management
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
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <MetricCard {...metric} />
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Overview" />
          <Tab label="Aging Analysis" />
          <Tab label="Payer Performance" />
          <Tab label="Account Details" />
        </Tabs>
      </Card>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <ChartCard title="A/R Trend Analysis" subtitle="Monthly A/R breakdown (in millions)">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={arTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `$${value}M`} />
                  <Legend />
                  <Area type="monotone" dataKey="total" stackId="1" stroke="#8884d8" fill="#8884d8" />
                  <Area type="monotone" dataKey="current" stackId="2" stroke="#82ca9d" fill="#82ca9d" />
                  <Area type="monotone" dataKey="overdue" stackId="2" stroke="#ffc658" fill="#ffc658" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12} lg={4}>
            <ChartCard title="A/R Distribution" subtitle="By aging bucket">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={arAgingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="percentage"
                  >
                    {arAgingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <ChartCard title="Aging Buckets" subtitle="Outstanding amounts by days">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={arAgingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis yAxisId="left" tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'amount') return `$${(value / 1000000).toFixed(2)}M`;
                      return value;
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="amount" fill="#8884d8" />
                  <Line yAxisId="right" type="monotone" dataKey="count" stroke="#ff7300" strokeWidth={3} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
        </Grid>
      )}

      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>Payer A/R Performance</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Payer</TableCell>
                        <TableCell align="right">Outstanding</TableCell>
                        <TableCell align="right">Avg Days</TableCell>
                        <TableCell align="center">Trend</TableCell>
                        <TableCell align="right">% of Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {payerARData.map((row) => (
                        <TableRow key={row.payer}>
                          <TableCell>{row.payer}</TableCell>
                          <TableCell align="right">${(row.amount / 1000000).toFixed(2)}M</TableCell>
                          <TableCell align="right">{row.days}</TableCell>
                          <TableCell align="center">
                            {row.trend === 'up' ? (
                              <TrendingUp color="error" />
                            ) : (
                              <TrendingDown color="success" />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {((row.amount / 7000000) * 100).toFixed(1)}%
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
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <TextField
                    size="small"
                    placeholder="Search accounts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ flexGrow: 1, maxWidth: 400 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Payer</InputLabel>
                    <Select
                      value={filterPayer}
                      label="Payer"
                      onChange={(e) => setFilterPayer(e.target.value)}
                    >
                      <MenuItem value="all">All Payers</MenuItem>
                      <MenuItem value="medicare">Medicare</MenuItem>
                      <MenuItem value="medicaid">Medicaid</MenuItem>
                      <MenuItem value="commercial">Commercial</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filterStatus}
                      label="Status"
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <MenuItem value="all">All Status</MenuItem>
                      <MenuItem value="progress">In Progress</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="review">Review</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Account ID</TableCell>
                        <TableCell>Patient</TableCell>
                        <TableCell>Payer</TableCell>
                        <TableCell>DOS</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell align="right">Age (Days)</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Last Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {accountsData.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>{row.id}</TableCell>
                          <TableCell>{row.patient}</TableCell>
                          <TableCell>{row.payer}</TableCell>
                          <TableCell>{row.dos}</TableCell>
                          <TableCell align="right">${row.amount.toFixed(2)}</TableCell>
                          <TableCell align="right">{row.age}</TableCell>
                          <TableCell>
                            <Chip
                              label={row.status}
                              color={getStatusColor(row.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{row.lastAction}</TableCell>
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

export default ARManagement;