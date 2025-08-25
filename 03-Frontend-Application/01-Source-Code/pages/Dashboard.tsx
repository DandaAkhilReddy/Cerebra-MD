import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Box,
  LinearProgress,
  useTheme
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Receipt,
  DoNotDisturb,
  AccessTime,
  Speed,
  Group
} from '@mui/icons-material';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import MetricCard from '../components/Common/MetricCard';
import ChartCard from '../components/Common/ChartCard';

// Sample data - in production, this would come from an API
const revenueData = [
  { month: 'Jan', revenue: 2400000, target: 2200000 },
  { month: 'Feb', revenue: 2210000, target: 2300000 },
  { month: 'Mar', revenue: 2290000, target: 2400000 },
  { month: 'Apr', revenue: 2500000, target: 2500000 },
  { month: 'May', revenue: 2590000, target: 2600000 },
  { month: 'Jun', revenue: 2800000, target: 2700000 },
];

const arAgingData = [
  { name: '0-30 days', value: 1200000, percentage: 40 },
  { name: '31-60 days', value: 600000, percentage: 20 },
  { name: '61-90 days', value: 450000, percentage: 15 },
  { name: '91-120 days', value: 300000, percentage: 10 },
  { name: '120+ days', value: 450000, percentage: 15 },
];

const denialRateData = [
  { month: 'Jan', rate: 12.5 },
  { month: 'Feb', rate: 11.8 },
  { month: 'Mar', rate: 10.2 },
  { month: 'Apr', rate: 9.5 },
  { month: 'May', rate: 8.9 },
  { month: 'Jun', rate: 8.2 },
];

const payerMixData = [
  { name: 'Medicare', value: 35, color: '#0088FE' },
  { name: 'Medicaid', value: 20, color: '#00C49F' },
  { name: 'Commercial', value: 30, color: '#FFBB28' },
  { name: 'Self-Pay', value: 10, color: '#FF8042' },
  { name: 'Other', value: 5, color: '#8884D8' },
];

const Dashboard = () => {
  const theme = useTheme();

  const metrics = [
    {
      title: 'Total Revenue',
      value: '$2.8M',
      change: '+12.5%',
      trend: 'up',
      icon: <AttachMoney />,
      color: theme.palette.success.main,
    },
    {
      title: 'A/R Days',
      value: '45.2',
      change: '-3.2 days',
      trend: 'down',
      icon: <AccessTime />,
      color: theme.palette.primary.main,
    },
    {
      title: 'Denial Rate',
      value: '8.2%',
      change: '-4.3%',
      trend: 'down',
      icon: <DoNotDisturb />,
      color: theme.palette.error.main,
    },
    {
      title: 'Clean Claim Rate',
      value: '94.5%',
      change: '+2.1%',
      trend: 'up',
      icon: <Receipt />,
      color: theme.palette.info.main,
    },
    {
      title: 'Days to Bill',
      value: '3.4',
      change: '-0.6 days',
      trend: 'down',
      icon: <Speed />,
      color: theme.palette.warning.main,
    },
    {
      title: 'Patient Satisfaction',
      value: '4.7/5',
      change: '+0.2',
      trend: 'up',
      icon: <Group />,
      color: theme.palette.secondary.main,
    },
  ];

  return (
    <Box className="fade-in">
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Executive Dashboard
      </Typography>
      
      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <MetricCard {...metric} />
          </Grid>
        ))}
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <ChartCard title="Revenue Trend" subtitle="Monthly revenue vs target">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                <Tooltip 
                  formatter={(value: number) => `$${(value / 1000000).toFixed(2)}M`}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke={theme.palette.primary.main} 
                  fill={theme.palette.primary.light} 
                  fillOpacity={0.6}
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke={theme.palette.secondary.main} 
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <ChartCard title="Payer Mix" subtitle="Revenue distribution by payer">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={payerMixData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ value }) => `${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {payerMixData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <ChartCard title="A/R Aging" subtitle="Outstanding receivables by age">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={arAgingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                <Tooltip 
                  formatter={(value: number) => `$${(value / 1000000).toFixed(2)}M`}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0' }}
                />
                <Bar dataKey="value" fill={theme.palette.primary.main} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="Denial Rate Trend" subtitle="Monthly denial rate improvement">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={denialRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip 
                  formatter={(value: number) => `${value}%`}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke={theme.palette.error.main} 
                  strokeWidth={3}
                  dot={{ fill: theme.palette.error.main, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;