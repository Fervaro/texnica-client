import React, { useState, useContext } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Box,
  InputAdornment,
  IconButton,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockResetIcon from '@mui/icons-material/LockReset';
import { authApi } from '../utils/api';
import { AuthContext } from '../context/AuthContext';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ open, onClose }) => {
  const { user, setMustChangePassword } = useContext(AuthContext);

  // Si el usuario debe cambiar la contraseña (primer inicio de sesión),
  // no se le pide la contraseña actual.
  const isForcedChange = !!user?.mustChangePassword;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    // No permitir cerrar el modal si aún debe cambiar la contraseña
    if (user?.mustChangePassword) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword.toLowerCase() === 'inicio') {
      setError('La nueva contraseña no puede ser la contraseña por defecto.');
      return;
    }

    setLoading(true);
    try {
      // En un cambio forzado (primer inicio de sesión) no se envía la contraseña actual
      if (isForcedChange) {
        await authApi.changePasswordFirstLogin(newPassword);
      } else {
        await authApi.changePassword(currentPassword, newPassword);
      }

      setSuccess(true);
      setMustChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Cerrar el modal después de un breve momento
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Error al cambiar la contraseña.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >

      <DialogTitle component="div" sx={{ textAlign: 'center', pt: 3 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: 'primary.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 1.5,
          }}
        >
          <LockResetIcon sx={{ color: 'primary.main', fontSize: 28 }} />
        </Box>
        <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
          Cambiar Contraseña
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {isForcedChange
            ? 'Por seguridad, debes crear una contraseña propia antes de continuar.'
            : 'Ingresa tu contraseña actual y define una nueva.'}
        </Typography>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              Contraseña actualizada correctamente.
            </Alert>
          )}

          {!isForcedChange && (
            <TextField
              label="Contraseña actual"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              sx={{ mb: 2.5 }}
              autoFocus
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
          )}

          <TextField
            label="Nueva contraseña"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mb: 2.5 }}
            autoFocus={isForcedChange}
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
            label="Confirmar nueva contraseña"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading || success}
            sx={{
              py: 1.2,
              borderRadius: 2,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #0f4c81, #1a6fbf)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0d3a63, #0f4c81)',
              },
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Guardar Contraseña'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default ChangePasswordModal;
