import React, { useState, useContext } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Link,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContextValue';
import api, { authApi } from '../../utils/api';
import { encryptRsaOaep } from '../../utils/crypto';

const Register: React.FC = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // Cifrar el password en el navegador para que no viaje en claro
      const keyRes = await authApi.getPublicKey();
      const encryptedPassword = await encryptRsaOaep(keyRes.data.publicKey, password);
      const res = await api.post('/auth/register', {
        userName,
        userEmail: email,
        encryptedPassword,
      });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Error registering user.';
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
        position: 'absolute', top: '-80px', right: '-80px',
        width: 300, height: 300, borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
      }} />
      <Box sx={{
        position: 'absolute', bottom: '-100px', left: '-60px',
        width: 400, height: 400, borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
      }} />

      <Paper
        elevation={24}
        sx={{
          width: '100%',
          maxWidth: 440,
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
            <PersonAddOutlinedIcon sx={{ color: 'white', fontSize: 28 }} />
          </Box>
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
            Create Account
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.5 }}>
            TPCS Texnica Production Control System – Register
          </Typography>
        </Box>

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ p: 4 }}>
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
            onChange={(e) => setUserName(e.target.value)}
            sx={{ mb: 2.5 }}
            autoFocus
          />

          <TextField
            label="Email"
            type="email"
            fullWidth
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2.5 }}
            autoComplete="email"
          />

          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 2.5 }}
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

          <TextField
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            sx={{ mb: 3 }}
          />

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
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
          </Button>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" sx={{ fontWeight: 600 }} underline="hover">
                Sign in here
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Register;
