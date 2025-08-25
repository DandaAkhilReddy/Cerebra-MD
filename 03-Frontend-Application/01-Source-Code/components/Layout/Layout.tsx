import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  AccountBalance as ARIcon,
  DoNotDisturb as DenialIcon,
  Receipt as ChargeIcon,
  People as PatientIcon,
  Code as CodingIcon,
  Payment as PayerIcon,
  TrendingUp as RevenueIcon,
  Speed as OperationalIcon,
  AccountCircle,
  Logout,
  ChevronLeft,
  AttachMoney,
} from '@mui/icons-material';

const drawerWidth = 280;

const menuItems = [
  { title: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { title: 'Financial AR', path: '/financial-ar', icon: <AttachMoney /> },
  { title: 'A/R Management', path: '/ar-management', icon: <ARIcon /> },
  { title: 'Denial Management', path: '/denial-management', icon: <DenialIcon /> },
  { title: 'Charge Capture', path: '/charge-capture', icon: <ChargeIcon /> },
  { title: 'Patient Access', path: '/patient-access', icon: <PatientIcon /> },
  { title: 'Coding Quality', path: '/coding-quality', icon: <CodingIcon /> },
  { title: 'Payer Performance', path: '/payer-performance', icon: <PayerIcon /> },
  { title: 'Revenue Integrity', path: '/revenue-integrity', icon: <RevenueIcon /> },
  { title: 'Operational Metrics', path: '/operational-metrics', icon: <OperationalIcon /> },
];

function Layout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    // Add logout logic here
    console.log('Logout');
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ px: 2, py: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
            }}
          >
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
              CM
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
              Cerebra MD
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              Medical Billing Analytics
            </Typography>
          </Box>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1, px: 2, py: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) handleDrawerToggle();
              }}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main,
                  color: 'white',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                  },
                },
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: location.pathname === item.path ? 'white' : theme.palette.text.secondary,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.title} 
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: location.pathname === item.path ? 600 : 400,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
          © 2024 Cerebra MD. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: 'white',
          color: theme.palette.text.primary,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(item => item.path === location.pathname)?.title || 'Dashboard'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Dr. Sarah Johnson
            </Typography>
            <IconButton onClick={handleMenuClick} sx={{ p: 0 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: theme.palette.primary.main }}>
                SJ
              </Avatar>
            </IconButton>
          </Box>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={handleMenuClose}>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          backgroundColor: theme.palette.background.default,
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default Layout;