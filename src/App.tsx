import { lazy, Suspense, useState, useContext, useEffect } from 'react';

import { HashRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, AppBar, Toolbar, Typography, IconButton, Menu, MenuItem, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import ChangePasswordModal from './components/ChangePasswordModal';
import { authApi } from './utils/api';

const Admin = lazy(() => import('./pages/Admin'));
const AdminUsuarios = lazy(() => import('./pages/AdminUsuarios'));
const AdminRoles = lazy(() => import('./pages/AdminRoles'));
const AdminPermisos = lazy(() => import('./pages/AdminPermisos'));
const Customers = lazy(() => import('./pages/Customers'));
const Factories = lazy(() => import('./pages/Factories'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Production = lazy(() => import('./pages/Production'));
const Warehouse = lazy(() => import('./pages/Warehouse'));
const PurchaseOrder = lazy(() => import('./pages/PurchaseOrder'));
const CreatePO = lazy(() => import('./pages/CreatePO'));
const Fgpo = lazy(() => import('./pages/Fgpo'));
const FabricRequirement = lazy(() => import('./pages/FabricRequirement'));
const FabricPO = lazy(() => import('./pages/FabricPO'));
const MillProduction = lazy(() => import('./pages/MillProduction'));
const MillTest = lazy(() => import('./pages/MillTest'));
const FabricShipment = lazy(() => import('./pages/FabricShipment'));
const FabricReceiving = lazy(() => import('./pages/FabricReceiving'));
const FourPoint = lazy(() => import('./pages/FourPoint'));
const InternalTest = lazy(() => import('./pages/InternalTest'));
const ShadeMatch = lazy(() => import('./pages/ShadeMatch'));
const InlineQuality = lazy(() => import('./pages/InlineQuality'));
const AqlInspection = lazy(() => import('./pages/AqlInspection'));
const PPSample = lazy(() => import('./pages/PPSample'));
const TOPSample = lazy(() => import('./pages/TOPSample'));
const ProductionReadiness = lazy(() => import('./pages/ProductionReadiness'));
const CuttingRelease = lazy(() => import('./pages/CuttingRelease'));
const CuttingControl = lazy(() => import('./pages/CuttingControl'));
const CuttingPanelQC = lazy(() => import('./pages/CuttingPanelQC'));
const TrimsControl = lazy(() => import('./pages/TrimsControl'));
const SewingProduction = lazy(() => import('./pages/SewingProduction'));
const FabricInventoryHub = lazy(() => import('./pages/FabricInventoryHub'));
const InventoryImport = lazy(() => import('./pages/InventoryImport'));
const FabricReservation = lazy(() => import('./pages/FabricReservation'));
const PackingControl = lazy(() => import('./pages/PackingControl'));
const StylesPage = lazy(() => import('./pages/Styles'));
const FabricsPage = lazy(() => import('./pages/Fabrics'));
const ColorsPage = lazy(() => import('./pages/Colors'));
const SizesPage = lazy(() => import('./pages/Sizes'));
const ComponentsPage = lazy(() => import('./pages/Components'));
const BoxTypesPage = lazy(() => import('./pages/BoxTypes'));
const StyleYieldsPage = lazy(() => import('./pages/StyleYields'));
const PricesPage = lazy(() => import('./pages/Prices'));
const FgpoLinesPage = lazy(() => import('./pages/FgpoLines'));
const ShipmentControl = lazy(() => import('./pages/ShipmentControl'));
const FabricMovements = lazy(() => import('./pages/FabricMovements'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
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
  const [customerMenuAnchor, setCustomerMenuAnchor] = useState<null | HTMLElement>(null);
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const { user, selectedCustomer, login } = useContext(AuthContext);
  const drawerWidth = 240;

  useEffect(() => {
    authApi.getLoginCustomers()
      .then((res) => setCustomers(res.data ?? []))
      .catch(() => {});
  }, []);

  const handleSwitchCustomer = async (customerId: number) => {
    setCustomerMenuAnchor(null);
    if (selectedCustomer && selectedCustomer.id === customerId) return;
    try {
      const res = await authApi.switchCustomer(customerId);
      login(res.data.token, res.data.user);
    } catch {
      /* el backend rechaza el cambio; se conserva la sesión actual */
    }
  };

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
          {selectedCustomer && user?.userType === 'Client' && (
            <Typography variant="body2" sx={{ mr: 2, fontWeight: 600 }}>
              Customer: {selectedCustomer.name}
            </Typography>
          )}
          {selectedCustomer && user?.userType !== 'Client' && (
            <>
              <Button
                color="inherit"
                onClick={(e) => setCustomerMenuAnchor(e.currentTarget)}
                endIcon={<ExpandMoreIcon />}
                sx={{ mr: 1, fontWeight: 600, textTransform: 'none' }}
              >
                Customer: {selectedCustomer.name}
              </Button>
              <Menu
                anchorEl={customerMenuAnchor}
                open={!!customerMenuAnchor}
                onClose={() => setCustomerMenuAnchor(null)}
              >
                {customers.map((c) => (
                  <MenuItem
                    key={c.id}
                    selected={c.id === selectedCustomer.id}
                    onClick={() => handleSwitchCustomer(c.id)}
                  >
                    {c.name}
                  </MenuItem>
                ))}
              </Menu>
            </>
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
        key={selectedCustomer?.id ?? 'none'}
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
            <Suspense fallback={<Box sx={{ p: 4, textAlign: 'center' }}>Loading page...</Box>}>
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
                  <Route path="fabric-movements" element={<FabricMovements />} />
                  <Route path="four-point" element={<FourPoint />} />
                  <Route path="internal-test" element={<InternalTest />} />
                  <Route path="shade-match" element={<ShadeMatch />} />
                  <Route path="inline-quality" element={<InlineQuality />} />
                  <Route path="endline-inspection" element={<AqlInspection inspectionType="Endline" title="Endline Inspection" subtitle="End-of-line inspection with AQL sampling (Automatic result)" />} />
                  <Route path="pre-final-inspection" element={<AqlInspection inspectionType="PreFinal" title="Pre-Final Inspection" subtitle="Pre-final inspection with AQL sampling (Automatic result)" />} />
                  <Route path="final-inspection" element={<AqlInspection inspectionType="Final" title="Final Inspection" subtitle="Final inspection with AQL sampling (Automatic result)" />} />
                  <Route path="pp-sample" element={<PPSample />} />
                  <Route path="top-sample" element={<TOPSample />} />
                  <Route path="production-readiness" element={<ProductionReadiness />} />
                  <Route path="cutting-release" element={<CuttingRelease />} />
                  <Route path="cutting-control" element={<CuttingControl />} />
                  <Route path="cutting-panel-qc" element={<CuttingPanelQC />} />
                  <Route path="trims-control" element={<TrimsControl />} />
                  <Route path="sewing-production" element={<SewingProduction />} />
                  <Route path="fabric-inventory" element={<FabricInventoryHub />} />
                  <Route path="inventory-import" element={<InventoryImport />} />
                  <Route path="fabric-reservation" element={<FabricReservation />} />
                  <Route path="packing-control" element={<PackingControl />} />
                  <Route path="shipment-control" element={<ShipmentControl />} />
                  <Route path="warehouse" element={<Warehouse />} />


                  <Route path="po/new" element={<CreatePO />} />
                  <Route path="po/:id" element={<PurchaseOrder />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </HashRouter>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

// Deployment verification marker - 2026-10-29
