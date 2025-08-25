import { useState } from 'react';
import { Box, Grid, Typography, Tabs, Tab, Card, CardContent } from '@mui/material';
import { Payment, TrendingUp, TrendingDown, Schedule } from '@mui/icons-material';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import MetricCard from '../components/Common/MetricCard';
import ChartCard from '../components/Common/ChartCard';

const PayerPerformance = () => {
  const [tabValue, setTabValue] = useState(0);
  
  const metrics = [
    { title: 'Avg Payment Days', value: '28.5', change: '-2.3 days', trend: 'down' as const, icon: <Schedule />, color: '#4caf50' },
    { title: 'Clean Claim Rate', value: '94.2%', change: '+1.8%', trend: 'up' as const, icon: <TrendingUp />, color: '#2196f3' },
    { title: 'Denial Rate', value: '8.3%', change: '-1.2%', trend: 'down' as const, icon: <TrendingDown />, color: '#ff9800' },
    { title: 'Payment Rate', value: '96.7%', change: '+0.5%', trend: 'up' as const, icon: <Payment />, color: '#9c27b0' },
  ];

  const payerData = [
    { name: 'Medicare', payment: 32, denial: 6.5, clean: 96.2, color: '#0088FE' },
    { name: 'Medicaid', payment: 45, denial: 12.1, clean: 89.5, color: '#00C49F' },
    { name: 'Blue Cross', payment: 25, denial: 7.8, clean: 94.8, color: '#FFBB28' },
    { name: 'Aetna', payment: 28, denial: 8.2, clean: 93.1, color: '#FF8042' },
    { name: 'United Health', payment: 30, denial: 9.1, clean: 92.3, color: '#8884D8' },
  ];

  return (
    <Box className="fade-in">
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>Payer Performance</Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <MetricCard {...metric} />
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Overview" />
          <Tab label="Payment Analysis" />
          <Tab label="Denial Analysis" />
        </Tabs>
      </Card>

      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <ChartCard title="Payer Performance Comparison" subtitle="Payment days and clean claim rates">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={payerData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="payment" fill="#8884d8" name="Payment Days" />
                  <Bar dataKey="clean" fill="#82ca9d" name="Clean Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <ChartCard title="Payer Mix" subtitle="Revenue distribution">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={payerData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="clean"
                  >
                    {payerData.map((entry, index) => (
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
      )}
    </Box>
  );
};

export default PayerPerformance;