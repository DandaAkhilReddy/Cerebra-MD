import { useState } from 'react';
import { Box, Grid, Typography, Tabs, Tab, Card, CardContent } from '@mui/material';
import { Code, TrendingUp, TrendingDown, CheckCircle, Download } from '@mui/icons-material';
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import MetricCard from '../components/Common/MetricCard';
import ChartCard from '../components/Common/ChartCard';

const CodingQuality = () => {
  const [tabValue, setTabValue] = useState(0);
  
  const metrics = [
    { title: 'Coding Accuracy', value: '96.8%', change: '+1.2%', trend: 'up' as const, icon: <CheckCircle />, color: '#4caf50' },
    { title: 'Query Rate', value: '12.5%', change: '-2.1%', trend: 'down' as const, icon: <TrendingDown />, color: '#2196f3' },
    { title: 'DRG Weight', value: '1.45', change: '+0.05', trend: 'up' as const, icon: <TrendingUp />, color: '#ff9800' },
    { title: 'Compliance Score', value: '98.2%', change: '+0.8%', trend: 'up' as const, icon: <Code />, color: '#9c27b0' },
  ];

  const codingData = [
    { month: 'Jan', accuracy: 95.2, queries: 14.5, compliance: 97.1 },
    { month: 'Feb', accuracy: 95.8, queries: 13.8, compliance: 97.5 },
    { month: 'Mar', accuracy: 96.1, queries: 13.2, compliance: 97.8 },
    { month: 'Apr', accuracy: 96.4, queries: 12.9, compliance: 98.0 },
    { month: 'May', accuracy: 96.6, queries: 12.7, compliance: 98.1 },
    { month: 'Jun', accuracy: 96.8, queries: 12.5, compliance: 98.2 },
  ];

  return (
    <Box className="fade-in">
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>Coding Quality</Typography>
      
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
          <Tab label="Accuracy Analysis" />
          <Tab label="DRG Analysis" />
        </Tabs>
      </Card>

      {tabValue === 0 && (
        <ChartCard title="Coding Quality Trends" subtitle="Monthly performance metrics">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={codingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="accuracy" stroke="#8884d8" strokeWidth={2} />
              <Line type="monotone" dataKey="compliance" stroke="#82ca9d" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </Box>
  );
};

export default CodingQuality;