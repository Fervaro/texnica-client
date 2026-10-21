import React, { useState, useContext } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Typography, Box, Collapse, SxProps, Theme, Divider,
  Avatar,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import CategoryIcon from '@mui/icons-material/Category';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import FactoryIcon from '@mui/icons-material/PrecisionManufacturing';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import ScienceIcon from '@mui/icons-material/Science';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import RuleIcon from '@mui/icons-material/Rule';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import StyleIcon from '@mui/icons-material/Style';
import ChecklistIcon from '@mui/icons-material/Checklist';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import TuneIcon from '@mui/icons-material/Tune';
import ChairAltIcon from '@mui/icons-material/ChairAlt';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import BusinessIcon from '@mui/icons-material/Business';
import FactoryIcon2 from '@mui/icons-material/Factory';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import FiberSmartRecordIcon from '@mui/icons-material/FiberSmartRecord';
import PaletteIcon from '@mui/icons-material/Palette';
import StraightenIcon from '@mui/icons-material/Straighten';
import WidgetsIcon from '@mui/icons-material/Widgets';
import PercentIcon from '@mui/icons-material/Percent';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LogoutIcon from '@mui/icons-material/Logout';
import { AuthContext } from '../context/AuthContext';

interface SidebarProps {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
  drawerWidth: number;
}

interface SubItem {
  text: string;
  icon: React.ReactNode;
  path: string;
}

interface NavSection {
  key: string;
  title: string;
  icon: React.ReactNode;
  subItems: SubItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, handleDrawerToggle, drawerWidth }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  // ===== Nueva estructura de módulos =====
  const navSections: NavSection[] = [
    {
      key: 'fabric',
      title: 'Fabric',
      icon: <CategoryIcon />,
      subItems: [
        { text: 'Fabric Requirement', icon: <LocalShippingIcon fontSize="small" />,        path: '/fabric-requirement' },
        { text: 'Fabric PO',        icon: <ReceiptIcon fontSize="small" />,                path: '/fabric-po' },
        { text: 'Mill Production',  icon: <PrecisionManufacturingIcon fontSize="small" />, path: '/mill-production' },
        { text: 'Mill Test',        icon: <ScienceIcon fontSize="small" />,                path: '/mill-test' },
        { text: 'Fabric Inventory', icon: <Inventory2Icon fontSize="small" />,             path: '/fabric-inventory' },
      ],
    },
    {
      key: 'quality',
      title: 'Quality Control',
      icon: <VerifiedUserIcon />,
      subItems: [
        { text: 'Four-Point',           icon: <RuleIcon fontSize="small" />,             path: '/four-point' },
        { text: 'Internal Test',        icon: <ScienceIcon fontSize="small" />,          path: '/internal-test' },
        { text: 'Shade Match',          icon: <ColorLensIcon fontSize="small" />,        path: '/shade-match' },
        { text: 'Inline Quality',       icon: <FactCheckIcon fontSize="small" />,        path: '/inline-quality' },
        { text: 'Endline Inspection',   icon: <FactCheckIcon fontSize="small" />,        path: '/endline-inspection' },
        { text: 'Pre-Final Inspection', icon: <FactCheckIcon fontSize="small" />,        path: '/pre-final-inspection' },
        { text: 'Final Inspection',     icon: <WorkspacePremiumIcon fontSize="small" />, path: '/final-inspection' },
        { text: 'PP Sample',            icon: <StyleIcon fontSize="small" />,            path: '/pp-sample' },
        { text: 'TOP Sample',           icon: <ChecklistIcon fontSize="small" />,        path: '/top-sample' },
      ],
    },
    {
      key: 'production',
      title: 'Production',
      icon: <FactoryIcon />,
      subItems: [
        { text: 'Production',          icon: <FactoryIcon fontSize="small" />,          path: '/production' },
        { text: 'Production Readiness', icon: <PlaylistAddCheckIcon fontSize="small" />, path: '/production-readiness' },
        { text: 'Cutting Release',     icon: <ContentCutIcon fontSize="small" />,        path: '/cutting-release' },
        { text: 'Cutting Control',     icon: <ContentCutIcon fontSize="small" />,        path: '/cutting-control' },
        { text: 'Cutting Panel QC',    icon: <ContentCutIcon fontSize="small" />,        path: '/cutting-panel-qc' },
        { text: 'Trims Control',       icon: <TuneIcon fontSize="small" />,             path: '/trims-control' },
        { text: 'Sewing Production',   icon: <ChairAltIcon fontSize="small" />,         path: '/sewing-production' },
      ],
    },
    {
      key: 'shipping',
      title: 'Shipping & Warehouse',
      icon: <LocalShippingIcon />,
      subItems: [
        { text: 'Packing Control',    icon: <InventoryIcon fontSize="small" />,        path: '/packing-control' },
        { text: 'Finished Goods',     icon: <WarehouseIcon fontSize="small" />,        path: '/finished-goods' },
        { text: 'Shipment Control',   icon: <FlightTakeoffIcon fontSize="small" />,    path: '/shipment-control' },
        { text: 'Warehouse',          icon: <WarehouseIcon fontSize="small" />,        path: '/warehouse' },
      ],
    },
    {
      key: 'master',
      title: 'Master Data',
      icon: <CategoryIcon />,
      subItems: [
        { text: 'Styles',       icon: <CheckroomIcon fontSize="small" />,             path: '/admin/styles' },
        { text: 'Fabrics',      icon: <FiberSmartRecordIcon fontSize="small" />,       path: '/admin/fabrics' },
        { text: 'Colors',       icon: <PaletteIcon fontSize="small" />,               path: '/admin/colors' },
        { text: 'Sizes',        icon: <StraightenIcon fontSize="small" />,            path: '/admin/sizes' },
        { text: 'Components',   icon: <WidgetsIcon fontSize="small" />,               path: '/admin/components' },
        { text: 'Box Types',    icon: <InventoryIcon fontSize="small" />,             path: '/admin/box-types' },
        { text: 'Style Yields', icon: <PercentIcon fontSize="small" />,               path: '/admin/style-yields' },
        { text: 'Prices',       icon: <AttachMoneyIcon fontSize="small" />,           path: '/admin/prices' },
        { text: 'FGPO Master',  icon: <AssignmentIcon fontSize="small" />,             path: '/fgpo' },
      ],
    },
  ];

  const adminSubItems: SubItem[] = [
    { text: 'Users',              icon: <PeopleIcon fontSize="small" />,  path: '/admin/usuarios' },
    { text: 'Roles & Permissions', icon: <SecurityIcon fontSize="small" />, path: '/admin/roles' },
    { text: 'Permissions',        icon: <SecurityIcon fontSize="small" />, path: '/admin/permisos' },
    { text: 'Customers',          icon: <BusinessIcon fontSize="small" />, path: '/admin/customers' },
    { text: 'Factories',          icon: <FactoryIcon2 fontSize="small" />, path: '/admin/factories' },
    { text: 'Suppliers',          icon: <LocalShippingIcon fontSize="small" />, path: '/admin/suppliers' },
  ];

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      admin: location.pathname.startsWith('/admin'),
    };
    navSections.forEach((sec) => {
      initial[sec.key] = sec.subItems.some((s) => location.pathname.startsWith(s.path));
    });
    return initial;
  });

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname === path;

  const isSectionActive = (sec: NavSection) =>
    sec.subItems.some((s) => location.pathname.startsWith(s.path));

  const itemStyle = (active: boolean): SxProps<Theme> => ({
    backgroundColor: active ? 'rgba(255,255,255,0.15)' : 'transparent',
    borderLeft: active ? '4px solid white' : '4px solid transparent',
    '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
    pl: 2,
  });

  const subItemStyle = (active: boolean): SxProps<Theme> => ({
    backgroundColor: active ? 'rgba(255,255,255,0.15)' : 'transparent',
    borderLeft: active ? '4px solid rgba(255,255,255,0.8)' : '4px solid transparent',
    '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' },
    pl: 5,
    py: 0.8,
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const avatarLetter = user?.userName?.charAt(0).toUpperCase() || 'U';

  const renderSection = (sec: NavSection) => (
    <React.Fragment key={sec.key}>
      <ListItem disablePadding>
        <ListItemButton
          onClick={() => toggleSection(sec.key)}
          sx={itemStyle(isSectionActive(sec))}
        >
          <ListItemIcon sx={{ color: 'white' }}>{sec.icon}</ListItemIcon>
          <ListItemText primary={sec.title} />
          {openSections[sec.key] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </ListItemButton>
      </ListItem>
      <Collapse in={openSections[sec.key]} timeout="auto" unmountOnExit>
        <List disablePadding>
          {sec.subItems.map((sub) => (
            <ListItem key={sub.path} disablePadding>
              <ListItemButton
                component={NavLink}
                to={sub.path}
                sx={subItemStyle(isActive(sub.path))}
              >
                <ListItemIcon sx={{ color: 'rgba(255,255,255,0.85)', minWidth: 32 }}>
                  {sub.icon}
                </ListItemIcon>
                <ListItemText
                  primary={<Typography sx={{ fontSize: '0.85rem' }}>{sub.text}</Typography>}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Collapse>
    </React.Fragment>
  );

  const drawer = (
    <Box
      sx={{
        backgroundColor: 'primary.main',
        color: 'white',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          TPCS Texnica Production Control System
        </Typography>
      </Toolbar>

      <List disablePadding sx={{ flex: 1, overflowY: 'auto' }}>
        <ListItem disablePadding>
          <ListItemButton component={NavLink} to="/" sx={itemStyle(isActive('/'))}>
            <ListItemIcon sx={{ color: 'white' }}><DashboardIcon /></ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>

        {/* Administration */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => toggleSection('admin')}
            sx={itemStyle(location.pathname.startsWith('/admin'))}
          >
            <ListItemIcon sx={{ color: 'white' }}><SettingsIcon /></ListItemIcon>
            <ListItemText primary="Administration" />
            {openSections['admin'] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>
        </ListItem>
        <Collapse in={openSections['admin']} timeout="auto" unmountOnExit>
          <List disablePadding>
            {adminSubItems.map((sub) => (
              <ListItem key={sub.path} disablePadding>
                <ListItemButton
                  component={NavLink}
                  to={sub.path}
                  sx={subItemStyle(isActive(sub.path))}
                >
                  <ListItemIcon sx={{ color: 'rgba(255,255,255,0.85)', minWidth: 32 }}>
                    {sub.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography sx={{ fontSize: '0.85rem' }}>{sub.text}</Typography>}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Collapse>

        {/* Module sections */}
        {navSections.map(renderSection)}
      </List>

      {/* User info and logout at bottom */}
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.25)', width: 36, height: 36, mr: 1.5, fontSize: '1rem', fontWeight: 700 }}>
            {avatarLetter}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
              {user?.userName || 'User'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.7rem' }} noWrap>
              {user?.email || ''}
            </Typography>
          </Box>
        </Box>

        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' },
          }}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 32 }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={<Typography sx={{ fontSize: '0.85rem' }}>Logout</Typography>} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      aria-label="mailbox folders"
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
