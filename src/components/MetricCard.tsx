// =============================================================================
// Metric Card Component
// Cerebra-MD Healthcare Analytics Platform
// =============================================================================

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  alpha
} from '@mui/material';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = 'primary',
  onClick
}) => {
  const theme = useTheme();
  const cardColor = theme.palette[color];

  return (
    <Card 
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        border: `1px solid ${alpha(cardColor.main, 0.12)}`,
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
          borderColor: alpha(cardColor.main, 0.3)
        } : {},
        position: 'relative'
      }}
      onClick={onClick}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: cardColor.main
        }}
      />
      
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ fontWeight: 500 }}
          >
            {title}
          </Typography>
          {icon && (
            <Box sx={{ color: cardColor.main, fontSize: 20 }}>
              {icon}
            </Box>
          )}
        </Box>

        <Typography 
          variant="h5" 
          component="div" 
          sx={{ 
            fontWeight: 600,
            color: 'text.primary',
            mb: subtitle ? 0.5 : 0
          }}
        >
          {value}
        </Typography>

        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};