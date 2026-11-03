import React, { useState, useEffect, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert, Snackbar
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import { permissionsApi } from '../../utils/api';

interface Permission {
  id: number;
  name: string;
  description: string;
  module: string;
  active: boolean;
}

const AdminPermisos: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newPermission, setNewPermission] = useState({ name: '', description: '', module: '' });
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await permissionsApi.getAll();
      setPermissions((res.data ?? []).filter((p: Permission) => p.active !== false));
    } catch {
      setError('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPermission = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!newPermission.name || !newPermission.module) return;

    setSaving(true);
    try {
      await permissionsApi.create({
        name: newPermission.name,
        description: newPermission.description,
        module: newPermission.module,
      });
      setNewPermission({ name: '', description: '', module: '' });
      setSnackbar({ severity: 'success', message: 'Permission created successfully.' });
      loadData();
    } catch (err: any) {
      setSnackbar({ severity: 'error', message: err?.response?.data?.message || 'Failed to create permission.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePermission = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this permission?')) return;
    try {
      await permissionsApi.delete(id);
      setSnackbar({ severity: 'success', message: 'Permission deleted successfully.' });
      loadData();
    } catch (err: any) {
      setSnackbar({ severity: 'error', message: err?.response?.data?.message || 'Failed to delete permission.' });
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <SecurityIcon color="primary" />
        <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold' }}>Permissions</Typography>
      </Box>

      <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'primary.main', mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Add new permission</Typography>
        <Box component="form" onSubmit={handleAddPermission} sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <TextField label="Module" size="small" required value={newPermission.module} onChange={e => setNewPermission({ ...newPermission, module: e.target.value })} sx={{ minWidth: 150 }} />
          <TextField label="Permission Name" size="small" required value={newPermission.name} onChange={e => setNewPermission({ ...newPermission, name: e.target.value })} sx={{ flexGrow: 1, minWidth: 200 }} />
          <TextField label="Description" size="small" value={newPermission.description} onChange={e => setNewPermission({ ...newPermission, description: e.target.value })} sx={{ flexGrow: 2, minWidth: 300 }} />
          <Button type="submit" variant="contained" color="primary" disabled={saving}>{saving ? 'Saving...' : 'New Permission'}</Button>
        </Box>
      </Paper>

      <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'primary.main' }}>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ backgroundColor: 'primary.light' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Module</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Permission</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {permissions.map(permission => (
                <TableRow key={permission.id} hover>
                  <TableCell>
                    <Chip label={permission.module} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell>{permission.name}</TableCell>
                  <TableCell>{permission.description}</TableCell>
                  <TableCell>
                    <Button size="small" color="error" onClick={() => handleDeletePermission(permission.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {permissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">No permissions found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar?.severity ?? 'success'} onClose={() => setSnackbar(null)} variant="filled">
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminPermisos;
