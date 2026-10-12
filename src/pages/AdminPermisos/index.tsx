import React, { useState, useEffect, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import { permissionsApi } from '../../utils/api';

interface Permission {
  ID: number;
  Name: string;
  Description: string;
  Module: string;
  Active: boolean;
}

const AdminPermisos: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newPermission, setNewPermission] = useState({ name: '', description: '', module: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await permissionsApi.getAll();
      setPermissions(res.data);
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
        Name: newPermission.name,
        Description: newPermission.description,
        Module: newPermission.module,
      });
      setNewPermission({ name: '', description: '', module: '' });
      loadData();
    } catch {
      setError('Failed to create permission');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePermission = async (id: number) => {
    try {
      await permissionsApi.delete(id);
      loadData();
    } catch {
      setError('Failed to delete permission');
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
          <TextField label="Permission Name" size="small" required value={newPermission.name} onChange={e => setNewPermission({ ...newPermission, name: e.target.value })} sx={{ flexGrow: 1, minWidth: 200 }} />
          <TextField label="Module" size="small" required value={newPermission.module} onChange={e => setNewPermission({ ...newPermission, module: e.target.value })} sx={{ minWidth: 150 }} />
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
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {permissions.map(permission => (
                <TableRow key={permission.ID} hover>
                  <TableCell>
                    <Chip label={permission.Module} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell>{permission.Name}</TableCell>
                  <TableCell>{permission.Description}</TableCell>
                  <TableCell>
                    <Chip label={permission.Active ? 'Active' : 'Inactive'} color={permission.Active ? 'success' : 'default'} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Button size="small" color="error" onClick={() => handleDeletePermission(permission.ID)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default AdminPermisos;
