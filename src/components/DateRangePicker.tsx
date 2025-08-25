// =============================================================================
// Date Range Picker Component (Simplified)
// Cerebra-MD Healthcare Analytics Platform  
// =============================================================================

import React from 'react';
import {
  Button,
  Box,
} from '@mui/material';
import { CalendarMonth } from '@mui/icons-material';

interface DateRange {
  start: string;
  end: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (dateRange: DateRange) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange
}) => {
  const formatDisplayRange = (dateRange: DateRange) => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    if (dateRange.start === dateRange.end) {
      return start.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
    
    return `${start.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })} - ${end.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })}`;
  };

  return (
    <Box>
      <Button
        variant="outlined"
        startIcon={<CalendarMonth />}
        onClick={() => {
          // Simplified - just show current range
          console.log('Date picker clicked - showing:', formatDisplayRange(value));
        }}
      >
        {formatDisplayRange(value)}
      </Button>
    </Box>
  );
};