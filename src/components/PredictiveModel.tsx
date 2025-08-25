// =============================================================================
// Predictive Model Component
// Cerebra-MD Healthcare Analytics Platform
// =============================================================================

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip
} from '@mui/material';

interface PredictiveModelProps {
  modelName?: string;
  accuracy?: number;
  prediction?: string;
  confidence?: number;
}

export const PredictiveModel: React.FC<PredictiveModelProps> = ({
  modelName = 'Revenue Prediction Model',
  accuracy = 95,
  prediction = 'Projected increase in revenue',
  confidence = 87
}) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {modelName}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip 
            label={`${accuracy}% Accuracy`} 
            color="success" 
            size="small" 
          />
          <Chip 
            label={`${confidence}% Confidence`} 
            color="primary" 
            size="small" 
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          {prediction}
        </Typography>
      </CardContent>
    </Card>
  );
};