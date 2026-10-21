import  { useState, useContext, useEffect } from 'react';

import { HashRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';

import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import ChangePasswordModal from './components/ChangePasswordModal';

import Admin from './pages/Admin';
import AdminUsuarios from './pages/AdminUsuarios';
import AdminRoles from './pages/AdminRoles';
import AdminPermisos from './pages/AdminPermisos';
import Customers from './pages/Customers';
import Factories from './pages/Factories';
import Suppliers from './pages/Suppliers';
import Production from './pages/Production';
import Warehouse from './pages/Warehouse';
import PurchaseOrder from './pages/PurchaseOrder';
import CreatePO from './pages/CreatePO';
import Fgpo from './pages/Fgpo';
import FabricRequirement from './pages/FabricRequirement';
import FabricPO from './pages/FabricPO';
import MillProduction from './pages/MillProduction';
import MillTest from './pages/MillTest';
import FabricShipment from './pages/FabricShipment';
import FabricReceiving from './pages/FabricReceiving';
import RollReceiving from './pages/RollReceiving';
import FourPoint from './pages/FourPoint';
import InternalTest from './pages/InternalTest';
import ShadeMatch from './pages/ShadeMatch';
import InlineQuality from './pages/InlineQuality';
import AqlInspection from './pages/AqlInspection';
import PPSample from './pages/PPSample';
import TOPSample from './pages/TOPSample';
import ProductionReadiness from './pages/ProductionReadiness';
import CuttingRelease from './pages/CuttingRelease';
import CuttingControl from './pages/CuttingControl';
import CuttingPanelQC from './pages/CuttingPanelQC';
import TrimsControl from './pages/TrimsControl';
import SewingProduction from './pages/SewingProduction';
import FabricInventoryHub from './pages/FabricInventoryHub';
import FabricReservation from './pages/FabricReservation';
import PackingControl from './pages/PackingControl';
import StylesPage from './pages/Styles';
import FabricsPage from './pages/Fabrics';
import ColorsPage from './pages/Colors';
import SizesPage from './pages/Sizes';
import ComponentsPage from './pages/Components';
import BoxTypesPage from './pages/BoxTypes';
import StyleYieldsPage from './pages/StyleYields';
import PricesPage from './pages/Prices';
import FgpoLinesPage from './pages/FgpoLines';
import FinishedGoods from './pages/FinishedGoods';
import ShipmentControl from './pages/ShipmentControl';
import FabricMovements from './pages/FabricMovements';



import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import { DataProvider } from './context/DataContext';
import { AuthProvider, AuthContext } from './context/AuthContext';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0f4c81', // Classic Blue
      light: '#e6f0fa',
    },
    secondary: {
      main: '#ffffff',
    },
    background: {
      default: '#f3f4f6',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const { user, selectedCustomer } = useContext(AuthContext);
  const drawerWidth = 240;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Mostrar el modal de cambio de contraseña automáticamente si el usuario debe cambiarla
  useEffect(() => {
    if (user?.mustChangePassword) {
      setChangePasswordOpen(true);
    }
  }, [user?.mustChangePassword]);


  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />

      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: 'white',
          color: 'text.primary',
          boxShadow: 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            TPCS Texnica Production Control System
          </Typography>
          {selectedCustomer && (
            <Typography variant="body2" sx={{ mr: 2, fontWeight: 600 }}>
              Cliente: {selectedCustomer.name}
            </Typography>
          )}
          <IconButton color="primary">
            <NotificationsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} drawerWidth={drawerWidth} />
      </Box>

      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <DataProvider>
          <HashRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="admin" element={<Admin />} />
                  <Route path="admin/usuarios" element={<AdminUsuarios />} />
                  <Route path="admin/roles" element={<AdminRoles />} />
                  <Route path="admin/permisos" element={<AdminPermisos />} />
                  <Route path="admin/customers" element={<Customers />} />
                  <Route path="admin/factories" element={<Factories />} />
                  <Route path="admin/suppliers" element={<Suppliers />} />
                  <Route path="admin/styles" element={<StylesPage />} />
                  <Route path="admin/fabrics" element={<FabricsPage />} />
                  <Route path="admin/colors" element={<ColorsPage />} />
                  <Route path="admin/sizes" element={<SizesPage />} />
                  <Route path="admin/components" element={<ComponentsPage />} />
                  <Route path="admin/box-types" element={<BoxTypesPage />} />
                  <Route path="admin/style-yields" element={<StyleYieldsPage />} />
                  <Route path="admin/prices" element={<PricesPage />} />
                  <Route path="admin/fgpo-lines" element={<FgpoLinesPage />} />
                  <Route path="production" element={<Production />} />

                  <Route path="fgpo" element={<Fgpo />} />
                  <Route path="fabric-requirement" element={<FabricRequirement />} />
                  <Route path="fabric-po" element={<FabricPO />} />
                  <Route path="mill-production" element={<MillProduction />} />
                  <Route path="mill-test" element={<MillTest />} />
                  <Route path="fabric-shipment" element={<FabricShipment />} />
                  <Route path="fabric-receiving" element={<FabricReceiving />} />
                  <Route path="roll-receiving" element={<RollReceiving />} />
                  <Route path="fabric-movements" element={<FabricMovements />} />
                  <Route path="four-point" element={<FourPoint />} />
                  <Route path="internal-test" element={<InternalTest />} />
                  <Route path="shade-match" element={<ShadeMatch />} />
                  <Route path="inline-quality" element={<InlineQuality />} />
                  <Route path="endline-inspection" element={<AqlInspection inspectionType="Endline" title="Endline Inspection" subtitle="Inspección de fin de línea con muestreo AQL (Result automático)" />} />
                  <Route path="pre-final-inspection" element={<AqlInspection inspectionType="PreFinal" title="Pre-Final Inspection" subtitle="Inspección pre-final con muestreo AQL (Result automático)" />} />
                  <Route path="final-inspection" element={<AqlInspection inspectionType="Final" title="Final Inspection" subtitle="Inspección final con muestreo AQL (Result automático)" />} />
                  <Route path="pp-sample" element={<PPSample />} />
                  <Route path="top-sample" element={<TOPSample />} />
                  <Route path="production-readiness" element={<ProductionReadiness />} />
                  <Route path="cutting-release" element={<CuttingRelease />} />
                  <Route path="cutting-control" element={<CuttingControl />} />
                  <Route path="cutting-panel-qc" element={<CuttingPanelQC />} />
                  <Route path="trims-control" element={<TrimsControl />} />
                  <Route path="sewing-production" element={<SewingProduction />} />
                  <Route path="fabric-inventory" element={<FabricInventoryHub />} />
                  <Route path="fabric-reservation" element={<FabricReservation />} />
                  <Route path="packing-control" element={<PackingControl />} />
                  <Route path="finished-goods" element={<FinishedGoods />} />
                  <Route path="shipment-control" element={<ShipmentControl />} />
                  <Route path="warehouse" element={<Warehouse />} />


                  <Route path="po/new" element={<CreatePO />} />
                  <Route path="po/:id" element={<PurchaseOrder />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
