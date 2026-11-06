import React, { useState, useContext } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api, { authApi } from '../../utils/api';
import { encryptRsaOaep } from '../../utils/crypto';

const Login: React.FC = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [userType, setUserType] = useState<'Employee' | 'Client' | null>(null);
  const [profileCustomer, setProfileCustomer] = useState<{ id: number; name: string } | null>(null);
  const [sessionExpired, setSessionExpired] = useState<boolean>(
    () => sessionStorage.getItem('sessionExpired') === '1'
  );

  React.useEffect(() => {
    authApi.getLoginCustomers()
      .then((res) => setCustomers(res.data ?? []))
      .catch(() => setError('Could not load customers.'));
  }, []);

  const loadProfile = async () => {
    if (!userName.trim()) {
      setUserType(null);
      setProfileCustomer(null);
      setCustomerId('');
      return;
    }
    try {
      const res = await authApi.getLoginProfile(userName.trim());
      const profile = res.data;
      setUserType(profile.userType);
      if (profile.userType === 'Client' && profile.customerId) {
        const assigned = { id: profile.customerId, name: profile.customerName };
        setProfileCustomer(assigned);
        setCustomerId(String(assigned.id));
      } else {
        setProfileCustomer(null);
        setCustomerId('');
      }
    } catch {
      setUserType(null);
      setProfileCustomer(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (userType !== 'Client' && !customerId) {
      setError('Select a customer to continue.');
      return;
    }
    setLoading(true);

    try {
      // Cifrar el password en el navegador para que no viaje en claro
      const keyRes = await authApi.getPublicKey();
      const encryptedPassword = await encryptRsaOaep(keyRes.data.publicKey, password);
      const res = await api.post('/auth/login', {
        userName,
        encryptedPassword,
        customerId: customerId ? Number(customerId) : 0,
      });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Error logging in. Please verify your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f4c81 0%, #1a6fbf 50%, #0d3a63 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative circles */}
      <Box sx={{
        position: 'absolute', top: '-80px', left: '-80px',
        width: 300, height: 300, borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
      }} />
      <Box sx={{
        position: 'absolute', bottom: '-100px', right: '-60px',
        width: 400, height: 400, borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
      }} />

      <Paper
        elevation={24}
        sx={{
          width: '100%',
          maxWidth: 420,
          mx: 2,
          borderRadius: 3,
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #0f4c81, #1a6fbf)',
            p: 4,
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              width: 56, height: 56, borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 1.5,
            }}
          >
            <LockOutlinedIcon sx={{ color: 'white', fontSize: 28 }} />
          </Box>
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
            Welcome
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.5 }}>
            TPCS Texnica Production Control System – Sign In
          </Typography>
        </Box>

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ p: 4 }}>
          {sessionExpired && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} onClose={() => { setSessionExpired(false); sessionStorage.removeItem('sessionExpired'); }}>
              Your session has expired. Please sign in again.
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Username"
            type="text"
            fullWidth
            required
            value={userName}
            onChange={(e) => {
              setUserName(e.target.value);
              setUserType(null);
              setProfileCustomer(null);
              setCustomerId('');
            }}
            onBlur={loadProfile}
            sx={{ mb: 2.5 }}
            autoComplete="username"
            autoFocus
          />

          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3 }}
            autoComplete="current-password"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {userType === 'Client' && profileCustomer ? (
            <TextField fullWidth label="Customer" value={profileCustomer.name} slotProps={{ input: { readOnly: true } }} sx={{ mb: 2.5 }} />
          ) : userType === 'Employee' ? (
            <FormControl fullWidth required sx={{ mb: 2.5 }}>
              <InputLabel id="customer-label">Customer</InputLabel>
              <Select
                labelId="customer-label"
                label="Cliente"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                {customers.map((customer) => (
                  <MenuItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              fontSize: '1rem',
              background: 'linear-gradient(135deg, #0f4c81, #1a6fbf)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0d3a63, #0f4c81)',
              },
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>

        </Box>
      </Paper>
    </Box>
  );
};

export default Login;
