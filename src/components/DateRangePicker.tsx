// =============================================================================
// Date Range Picker Component
// Cerebra-MD Healthcare Analytics Platform
// =============================================================================

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Popover,
  Button,
  Stack,
  Chip,
  Typography,
  useTheme
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CalendarMonth } from '@mui/icons-material';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

interface DateRange {
  start: string;
  end: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (dateRange: DateRange) => void;
}

const PRESET_RANGES = [
  {
    label: 'Today',
    getValue: () => {
      const today = new Date();
      return {
        start: format(today, 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd')
      };
    }
  },
  {
    label: 'Last 7 days',
    getValue: () => {
      const end = new Date();
      const start = subDays(end, 6);
      return {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd')
      };
    }
  },
  {
    label: 'Last 30 days',
    getValue: () => {
      const end = new Date();
      const start = subDays(end, 29);
      return {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd')
      };
    }
  },
  {
    label: 'This month',
    getValue: () => {
      const now = new Date();
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd')
      };
    }
  },
  {
    label: 'Last month',
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        end: format(endOfMonth(lastMonth), 'yyyy-MM-dd')
      };
    }
  },
  {
    label: 'This year',
    getValue: () => {
      const now = new Date();
      return {
        start: format(startOfYear(now), 'yyyy-MM-dd'),
        end: format(endOfYear(now), 'yyyy-MM-dd')
      };
    }
  }
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [tempStart, setTempStart] = useState<Date | null>(new Date(value.start));
  const [tempEnd, setTempEnd] = useState<Date | null>(new Date(value.end));

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setTempStart(new Date(value.start));
    setTempEnd(new Date(value.end));
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleApply = () => {
    if (tempStart && tempEnd) {
      onChange({
        start: format(tempStart, 'yyyy-MM-dd'),
        end: format(tempEnd, 'yyyy-MM-dd')
      });
    }
    handleClose();
  };

  const handlePresetSelect = (preset: typeof PRESET_RANGES[0]) => {
    const range = preset.getValue();
    onChange(range);
    handleClose();
  };

  const formatDisplayRange = (dateRange: DateRange) => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
      return format(start, 'MMM d, yyyy');
    }
    
    if (start.getFullYear() === end.getFullYear()) {
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
      }
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    }
    
    return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
  };

  const open = Boolean(anchorEl);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Button
          variant="outlined"
          startIcon={<CalendarMonth />}
          onClick={handleOpen}
          sx={{
            borderColor: theme.palette.divider,
            color: theme.palette.text.primary,
            '&:hover': {
              borderColor: theme.palette.primary.main,
              backgroundColor: theme.palette.action.hover
            }
          }}
        >
          {formatDisplayRange(value)}
        </Button>

        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          PaperProps={{
            sx: {
              p: 2,
              minWidth: 400
            }
          }}
        >
          <Typography variant="h6" gutterBottom>
            Select Date Range
          </Typography>

          {/* Preset ranges */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Quick Select
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {PRESET_RANGES.map((preset) => (
                <Chip
                  key={preset.label}
                  label={preset.label}
                  variant="outlined"
                  size="small"
                  onClick={() => handlePresetSelect(preset)}
                  sx={{
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover
                    }
                  }}
                />
              ))}
            </Stack>
          </Box>

          {/* Date pickers */}
          <Stack spacing={2}>
            <Typography variant="subtitle2" color="text.secondary">
              Custom Range
            </Typography>
            <Stack direction="row" spacing={2}>
              <DatePicker
                label="Start Date"
                value={tempStart}
                onChange={(date) => setTempStart(date)}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true
                  }
                }}
              />
              <DatePicker
                label="End Date"
                value={tempEnd}
                onChange={(date) => setTempEnd(date)}
                minDate={tempStart || undefined}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true
                  }
                }}
              />
            </Stack>
          </Stack>

          {/* Action buttons */}
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleApply}
              disabled={!tempStart || !tempEnd}
            >
              Apply
            </Button>
          </Stack>
        </Popover>
      </Box>
    </LocalizationProvider>
  );
};