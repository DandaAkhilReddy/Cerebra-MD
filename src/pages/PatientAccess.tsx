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
  Avatar,
} from '@mui/material';
import {
  People,
  Schedule,
  CheckCircle,
  Warning,
  Download,
  PersonAdd,
  Assignment,
  Payment,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
} from 'recharts';
import MetricCard from '../components/Common/MetricCard';
import ChartCard from '../components/Common/ChartCard';

// Sample data
const patientAccessMetrics = [
  {
    title: 'Registration Rate',
    value: '96.5%',
    change: '+2.1%',
    trend: 'up' as const,
    icon: <PersonAdd />,
    color: '#4caf50',
  },
  {
    title: 'Authorization Rate',
    value: '92.3%',
    change: '+1.8%',
    trend: 'up' as const,
    icon: <CheckCircle />,
    color: '#2196f3',
  },
  {
    title: 'Eligibility Issues',
    value: '3.2%',
    change: '-0.9%',
    trend: 'down' as const,
    icon: <Warning />,
    color: '#ff9800',
  },
  {
    title: 'Collection Rate',
    value: '85.7%',
    change: '+3.4%',
    trend: 'up' as const,
    icon: <Payment />,
    color: '#9c27b0',
  },
];

const registrationTrendData = [
  { month: 'Jan', registrations: 1250, complete: 1205, incomplete: 45, verified: 1180 },
  { month: 'Feb', registrations: 1320, complete: 1278, incomplete: 42, verified: 1255 },
  { month: 'Mar', registrations: 1480, complete: 1432, incomplete: 48, verified: 1410 },
  { month: 'Apr', registrations: 1565, complete: 1518, incomplete: 47, verified: 1495 },
  { month: 'May', registrations: 1620, complete: 1572, incomplete: 48, verified: 1548 },
  { month: 'Jun', registrations: 1680, complete: 1635, incomplete: 45, verified: 1612 },
];

const authorizationData = [
  { payer: 'Medicare', required: 45, obtained: 42, pending: 2, denied: 1 },
  { payer: 'Medicaid', required: 38, obtained: 35, pending: 2, denied: 1 },
  { payer: 'Blue Cross', required: 65, obtained: 61, pending: 3, denied: 1 },
  { payer: 'Aetna', required: 42, obtained: 39, pending: 2, denied: 1 },
  { payer: 'United Health', required: 55, obtained: 51, pending: 3, denied: 1 },
  { payer: 'Cigna', required: 28, obtained: 26, pending: 1, denied: 1 },
];

const eligibilityVerificationData = [
  { status: 'Verified', count: 1580, percentage: 94.2 },
  { status: 'Pending', count: 65, percentage: 3.9 },
  { status: 'Failed', count: 32, percentage: 1.9 },
];

const patientCollectionsData = [
  { month: 'Jan', copays: 125000, deductibles: 85000, coinsurance: 45000, total: 255000 },
  { month: 'Feb', copays: 132000, deductibles: 89000, coinsurance: 48000, total: 269000 },
  { month: 'Mar', copays: 145000, deductibles: 95000, coinsurance: 52000, total: 292000 },
  { month: 'Apr', copays: 152000, deductibles: 98000, coinsurance: 55000, total: 305000 },
  { month: 'May', copays: 148000, deductibles: 92000, coinsurance: 51000, total: 291000 },
  { month: 'Jun', copays: 155000, deductibles: 102000, coinsurance: 58000, total: 315000 },
];

const departmentAccessData = [
  { department: 'Emergency', registrations: 2850, complete: 98.5, avgTime: 8.2 },
  { department: 'Outpatient Surgery', registrations: 1650, complete: 97.8, avgTime: 15.5 },
  { department: 'Radiology', registrations: 3200, complete: 99.1, avgTime: 5.8 },
  { department: 'Laboratory', registrations: 2890, complete: 98.9, avgTime: 4.2 },
  { department: 'Cardiology', registrations: 980, complete: 96.8, avgTime: 18.7 },
  { department: 'Orthopedics', registrations: 750, complete: 97.2, avgTime: 12.3 },
];

const recentRegistrations = [
  {
    id: 'REG001234',
    patient: 'John Smith',
    payer: 'Medicare',
    registrationDate: '2024-01-20',
    status: 'Complete',
    department: 'Emergency',
    authorization: 'Not Required',
    copay: 25.00,
  },
  {
    id: 'REG001235',
    patient: 'Mary Johnson',
    payer: 'Blue Cross',
    registrationDate: '2024-01-20',
    status: 'Pending Verification',
    department: 'Surgery',
    authorization: 'Required',
    copay: 50.00,
  },
  {
    id: 'REG001236',
    patient: 'Robert Wilson',
    payer: 'Aetna',
    registrationDate: '2024-01-19',
    status: 'Complete',
    department: 'Cardiology',
    authorization: 'Obtained',
    copay: 35.00,
  },
  {
    id: 'REG001237',
    patient: 'Patricia Davis',
    payer: 'United Health',
    registrationDate: '2024-01-19',
    status: 'Incomplete',
    department: 'Orthopedics',
    authorization: 'Pending',
    copay: 40.00,
  },
];

const PatientAccess = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete': return 'success';
      case 'Pending Verification': return 'warning';
      case 'Incomplete': return 'error';
      case 'Obtained': return 'success';
      case 'Required': return 'warning';
      case 'Not Required': return 'info';
      case 'Pending': return 'warning';
      default: return 'default';
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <Box className="fade-in">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Patient Access
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
        {patientAccessMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <MetricCard {...metric} />
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Registration" />
          <Tab label="Authorization" />
          <Tab label="Eligibility" />
          <Tab label="Collections" />
        </Tabs>
      </Card>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <ChartCard title="Registration Trends" subtitle="Monthly registration and completion rates">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={registrationTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="registrations"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="complete"
                    stackId="2"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="verified"
                    stackId="3"
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
                <Typography variant="h6" sx={{ mb: 3 }}>Department Performance</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Department</TableCell>
                        <TableCell align="right">Rate</TableCell>
                        <TableCell align="right">Avg Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {departmentAccessData.map((dept) => (
                        <TableRow key={dept.department}>
                          <TableCell>{dept.department}</TableCell>
                          <TableCell align="right">{dept.complete}%</TableCell>
                          <TableCell align="right">{dept.avgTime}m</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>Recent Registrations</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Registration ID</TableCell>
                        <TableCell>Patient</TableCell>
                        <TableCell>Payer</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell>Authorization</TableCell>
                        <TableCell align="right">Copay</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentRegistrations.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>{row.id}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 32, height: 32 }}>
                                {row.patient.split(' ').map(n => n[0]).join('')}
                              </Avatar>
                              {row.patient}
                            </Box>
                          </TableCell>
                          <TableCell>{row.payer}</TableCell>
                          <TableCell>{row.registrationDate}</TableCell>
                          <TableCell>
                            <Chip
                              label={row.status}
                              color={getStatusColor(row.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{row.department}</TableCell>
                          <TableCell>
                            <Chip
                              label={row.authorization}
                              color={getStatusColor(row.authorization)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">${row.copay.toFixed(2)}</TableCell>
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

      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <ChartCard title="Authorization Requirements by Payer" subtitle="Prior authorization tracking">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={authorizationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="payer" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="required" fill="#8884d8" name="Required" />
                  <Bar dataKey="obtained" fill="#82ca9d" name="Obtained" />
                  <Bar dataKey="pending" fill="#ffc658" name="Pending" />
                  <Bar dataKey="denied" fill="#ff7300" name="Denied" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>Authorization Summary</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Payer</TableCell>
                        <TableCell align="right">Required</TableCell>
                        <TableCell align="right">Obtained</TableCell>
                        <TableCell align="right">Success Rate</TableCell>
                        <TableCell align="right">Pending</TableCell>
                        <TableCell align="right">Denied</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {authorizationData.map((row) => (
                        <TableRow key={row.payer}>
                          <TableCell>{row.payer}</TableCell>
                          <TableCell align="right">{row.required}</TableCell>
                          <TableCell align="right">{row.obtained}</TableCell>
                          <TableCell align="right">
                            {((row.obtained / row.required) * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell align="right">{row.pending}</TableCell>
                          <TableCell align="right">{row.denied}</TableCell>
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
          <Grid item xs={12} md={6}>
            <ChartCard title="Eligibility Verification Status" subtitle="Current verification results">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={eligibilityVerificationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {eligibilityVerificationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>Verification Breakdown</Typography>
                {eligibilityVerificationData.map((item, index) => (
                  <Box key={item.status} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">{item.status}</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {item.count} ({item.percentage}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={item.percentage}
                      sx={{ height: 8, borderRadius: 4 }}
                      color={index === 0 ? 'success' : index === 1 ? 'warning' : 'error'}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <ChartCard title="Patient Collections Trends" subtitle="Monthly collection patterns">
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={patientCollectionsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value: number) => `$${(value / 1000).toFixed(1)}K`} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="copays"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                  />
                  <Area
                    type="monotone"
                    dataKey="deductibles"
                    stackId="1"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                  />
                  <Area
                    type="monotone"
                    dataKey="coinsurance"
                    stackId="1"
                    stroke="#ffc658"
                    fill="#ffc658"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default PatientAccess;