// =============================================================================
// Filter Panel Component  
// Cerebra-MD Healthcare Analytics Platform
// =============================================================================

import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';

interface FilterPanelProps {
  facilities?: { id: string; name: string }[];
  payers?: { id: string; name: string }[];
  providers?: { id: string; name: string }[];
  selectedFacility?: string;
  selectedPayer?: string;
  selectedProvider?: string;
  onFacilityChange?: (value: string) => void;
  onPayerChange?: (value: string) => void;
  onProviderChange?: (value: string) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  facilities = [],
  payers = [],
  providers = [],
  selectedFacility = 'all',
  selectedPayer = 'all',
  selectedProvider = 'all',
  onFacilityChange = () => {},
  onPayerChange = () => {},
  onProviderChange = () => {}
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Facility</InputLabel>
            <Select
              value={selectedFacility}
              onChange={(e) => onFacilityChange(e.target.value)}
              label="Facility"
            >
              <MenuItem value="all">All Facilities</MenuItem>
              {facilities.map(facility => (
                <MenuItem key={facility.id} value={facility.id}>
                  {facility.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Payer</InputLabel>
            <Select
              value={selectedPayer}
              onChange={(e) => onPayerChange(e.target.value)}
              label="Payer"
            >
              <MenuItem value="all">All Payers</MenuItem>
              {payers.map(payer => (
                <MenuItem key={payer.id} value={payer.id}>
                  {payer.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Provider</InputLabel>
            <Select
              value={selectedProvider}
              onChange={(e) => onProviderChange(e.target.value)}
              label="Provider"
            >
              <MenuItem value="all">All Providers</MenuItem>
              {providers.map(provider => (
                <MenuItem key={provider.id} value={provider.id}>
                  {provider.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );
};