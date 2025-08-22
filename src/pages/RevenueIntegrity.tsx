import { useState } from 'react';
import { Box, Grid, Typography, Tabs, Tab, Card } from '@mui/material';
import { TrendingUp, Security, Warning, CheckCircle } from '@mui/icons-material';
import { LineChart, Line, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import MetricCard from '../components/Common/MetricCard';
import ChartCard from '../components/Common/ChartCard';

const RevenueIntegrity = () => {
  const [tabValue, setTabValue] = useState(0);
  
  const metrics = [
    { title: 'Revenue Integrity', value: '98.5%', change: '+0.3%', trend: 'up' as const, icon: <Security />, color: '#4caf50' },
    { title: 'Audit Score', value: '96.2%', change: '+1.1%', trend: 'up' as const, icon: <CheckCircle />, color: '#2196f3' },
    { title: 'Risk Score', value: '2.1%', change: '-0.5%', trend: 'down' as const, icon: <Warning />, color: '#ff9800' },
    { title: 'Recovery Rate', value: '94.8%', change: '+2.2%', trend: 'up' as const, icon: <TrendingUp />, color: '#9c27b0' },
  ];

  const integrityData = [
    { month: 'Jan', integrity: 97.8, audit: 95.2, recovery: 92.5 },
    { month: 'Feb', integrity: 98.0, audit: 95.5, recovery: 93.1 },
    { month: 'Mar', integrity: 98.2, audit: 95.8, recovery: 93.8 },
    { month: 'Apr', integrity: 98.3, audit: 96.0, recovery: 94.2 },
    { month: 'May', integrity: 98.4, audit: 96.1, recovery: 94.5 },
    { month: 'Jun', integrity: 98.5, audit: 96.2, recovery: 94.8 },
  ];

  return (
    <Box className="fade-in">
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>Revenue Integrity</Typography>
      
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
          <Tab label="Audit Results" />
          <Tab label="Risk Analysis" />
        </Tabs>
      </Card>

      {tabValue === 0 && (
        <ChartCard title="Revenue Integrity Trends" subtitle="Monthly integrity metrics">
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={integrityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[90, 100]} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="integrity" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              <Area type="monotone" dataKey="audit" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
              <Area type="monotone" dataKey="recovery" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </Box>
  );
};

export default RevenueIntegrity;