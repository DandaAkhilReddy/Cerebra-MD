import { Card, CardContent, Typography, Box, IconButton, Menu, MenuItem } from '@mui/material';
import { MoreVert, Download, Refresh } from '@mui/icons-material';
import { useState } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

const ChartCard = ({ title, subtitle, children, action }: ChartCardProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDownload = () => {
    // Implement download logic
    console.log('Downloading chart...');
    handleMenuClose();
  };

  const handleRefresh = () => {
    // Implement refresh logic
    console.log('Refreshing data...');
    handleMenuClose();
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box>
            {action || (
              <>
                <IconButton size="small" onClick={handleMenuClick}>
                  <MoreVert />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem onClick={handleDownload}>
                    <Download sx={{ mr: 1, fontSize: 20 }} />
                    Download
                  </MenuItem>
                  <MenuItem onClick={handleRefresh}>
                    <Refresh sx={{ mr: 1, fontSize: 20 }} />
                    Refresh
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        </Box>
      </CardContent>
      <CardContent sx={{ flex: 1, pt: 0 }}>
        {children}
      </CardContent>
    </Card>
  );
};

export default ChartCard;