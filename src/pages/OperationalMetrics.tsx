import { useState } from 'react';
import { Box, Grid, Typography, Tabs, Tab, Card } from '@mui/material';
import { Speed, Group, Schedule, TrendingUp } from '@mui/icons-material';
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import MetricCard from '../components/Common/MetricCard';
import ChartCard from '../components/Common/ChartCard';

const OperationalMetrics = () => {
  const [tabValue, setTabValue] = useState(0);
  
  const metrics = [
    { title: 'Productivity', value: '125%', change: '+5.2%', trend: 'up' as const, icon: <Speed />, color: '#4caf50' },
    { title: 'Staff Utilization', value: '87.3%', change: '+2.1%', trend: 'up' as const, icon: <Group />, color: '#2196f3' },
    { title: 'Turnaround Time', value: '2.8 days', change: '-0.3 days', trend: 'down' as const, icon: <Schedule />, color: '#ff9800' },
    { title: 'Quality Score', value: '94.6%', change: '+1.8%', trend: 'up' as const, icon: <TrendingUp />, color: '#9c27b0' },
  ];

  const operationalData = [
    { month: 'Jan', productivity: 118, utilization: 85.2, quality: 92.8 },
    { month: 'Feb', productivity: 120, utilization: 86.1, quality: 93.2 },
    { month: 'Mar', productivity: 122, utilization: 86.8, quality: 93.8 },
    { month: 'Apr', productivity: 123, utilization: 87.0, quality: 94.1 },
    { month: 'May', productivity: 124, utilization: 87.2, quality: 94.4 },
    { month: 'Jun', productivity: 125, utilization: 87.3, quality: 94.6 },
  ];

  return (
    <Box className="fade-in">
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>Operational Metrics</Typography>
      
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
          <Tab label="Productivity" />
          <Tab label="Quality" />
        </Tabs>
      </Card>

      {tabValue === 0 && (
        <ChartCard title="Operational Performance Trends" subtitle="Monthly operational KPIs">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={operationalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="productivity" stroke="#8884d8" strokeWidth={2} />
              <Line type="monotone" dataKey="utilization" stroke="#82ca9d" strokeWidth={2} />
              <Line type="monotone" dataKey="quality" stroke="#ffc658" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </Box>
  );
};

export default OperationalMetrics;