// =============================================================================
// KPI Card Component
// Cerebra-MD Healthcare Analytics Platform
// =============================================================================

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Tooltip,
  useTheme,
  alpha,
  IconButton
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Info,
  Remove as TrendNeutral
} from '@mui/icons-material';

interface KPICardProps {
  title: string;
  value: number | string;
  format?: 'number' | 'currency' | 'percentage' | 'decimal' | 'days' | 'score';
  subtitle?: string;
  trend?: number;
  target?: number;
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  tooltip?: string;
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  format = 'number',
  subtitle,
  trend,
  target,
  icon,
  color = 'primary',
  tooltip,
  onClick
}) => {
  const theme = useTheme();

  // Format value based on type
  const formatValue = (val: number | string, fmt: string): string => {
    if (typeof val === 'string') return val;
    
    switch (fmt) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'decimal':
        return val.toFixed(1);
      case 'days':
        return `${val.toFixed(0)} days`;
      case 'score':
        return `${val.toFixed(0)}/100`;
      case 'number':
      default:
        return val.toLocaleString();
    }
  };

  // Get trend icon and color
  const getTrendDisplay = (trendValue?: number) => {
    if (!trendValue) return null;
    
    if (trendValue > 0) {
      return {
        icon: <TrendingUp sx={{ fontSize: 16 }} />,
        color: theme.palette.success.main,
        text: `+${trendValue.toFixed(1)}%`
      };
    } else if (trendValue < 0) {
      return {
        icon: <TrendingDown sx={{ fontSize: 16 }} />,
        color: theme.palette.error.main,
        text: `${trendValue.toFixed(1)}%`
      };
    }
    
    return {
      icon: <TrendNeutral sx={{ fontSize: 16 }} />,
      color: theme.palette.text.secondary,
      text: '0%'
    };
  };

  // Calculate target achievement
  const getTargetAchievement = () => {
    if (!target || typeof value !== 'number') return null;
    
    const achievement = (value / target) * 100;
    let achievementColor: 'success' | 'warning' | 'error' = 'success';
    
    if (achievement < 70) achievementColor = 'error';
    else if (achievement < 90) achievementColor = 'warning';
    
    return {
      percentage: achievement,
      color: achievementColor,
      isGood: achievement >= 90
    };
  };

  const trendDisplay = getTrendDisplay(trend);
  const targetAchievement = getTargetAchievement();
  const cardColor = theme.palette[color];

  const cardContent = (
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
        position: 'relative',
        overflow: 'visible'
      }}
      onClick={onClick}
    >
      {/* Color accent bar */}
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
        {/* Header with title and icon */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              fontWeight: 500,
              lineHeight: 1.2,
              maxWidth: icon ? 'calc(100% - 40px)' : '100%'
            }}
          >
            {title}
          </Typography>
          {tooltip ? (
            <Tooltip title={tooltip}>
              <IconButton size="small" sx={{ p: 0.5, color: 'text.secondary' }}>
                <Info sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          ) : (
            icon && (
              <Box sx={{ color: cardColor.main, fontSize: 20 }}>
                {icon}
              </Box>
            )
          )}
        </Box>

        {/* Main value */}
        <Typography 
          variant="h4" 
          component="div" 
          sx={{ 
            fontWeight: 700,
            color: 'text.primary',
            mb: 0.5,
            lineHeight: 1.1
          }}
        >
          {formatValue(value, format)}
        </Typography>

        {/* Subtitle */}
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            {subtitle}
          </Typography>
        )}

        {/* Bottom row with trend and target */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
          {/* Trend indicator */}
          {trendDisplay && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ color: trendDisplay.color }}>
                {trendDisplay.icon}
              </Box>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: trendDisplay.color,
                  fontWeight: 600
                }}
              >
                {trendDisplay.text}
              </Typography>
            </Box>
          )}

          {/* Target achievement */}
          {targetAchievement && (
            <Tooltip title={`Target: ${formatValue(target!, format)}`}>
              <Chip
                label={`${targetAchievement.percentage.toFixed(0)}% of target`}
                size="small"
                color={targetAchievement.color}
                variant="outlined"
                sx={{ 
                  height: 20,
                  fontSize: '0.7rem',
                  '& .MuiChip-label': { px: 1 }
                }}
              />
            </Tooltip>
          )}
        </Box>

        {/* Progress bar for target achievement */}
        {targetAchievement && (
          <Box sx={{ mt: 1 }}>
            <Box
              sx={{
                height: 4,
                backgroundColor: alpha(theme.palette.grey[500], 0.2),
                borderRadius: 2,
                overflow: 'hidden'
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${Math.min(targetAchievement.percentage, 100)}%`,
                  backgroundColor: theme.palette[targetAchievement.color].main,
                  borderRadius: 'inherit',
                  transition: 'width 1s ease-out'
                }}
              />
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return tooltip ? (
    <Tooltip title={tooltip} placement="top">
      {cardContent}
    </Tooltip>
  ) : (
    cardContent
  );
};