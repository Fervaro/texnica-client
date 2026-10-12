import React, { useState, useEffect, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, Chip, CircularProgress, Alert
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import { rolesApi, permissionsApi } from '../../utils/api';

interface Role {
  ID: number;
  Name: string;
  Description: string;
  Active: boolean;
  Permissions?: Permission[];
}

interface Permission {
  ID: number;
  Name: string;
  Description: string;
  Module: string;
  Active: boolean;
}

const AdminRoles: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        rolesApi.getAll(),
        permissionsApi.getAll(),
      ]);
      setRoles(rolesRes.data);
      setPermissions(permissionsRes.data);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!newRole.name) return;

    setSaving(true);
    try {
      await rolesApi.create({
        Name: newRole.name,
        Description: newRole.description,
        PermissionIds: selectedPermissions,
      });
      setNewRole({ name: '', description: '' });
      setSelectedPermissions([]);
      loadData();
    } catch {
      setError('Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (id: number) => {
    try {
      await rolesApi.delete(id);
      loadData();
    } catch {
      setError('Failed to delete role');
    }
  };

  const togglePermission = (permissionId: number) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <SecurityIcon color="primary" />
        <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold' }}>Roles & Permissions</Typography>
      </Box>

      <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'primary.main', mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Add new role</Typography>
        <Box component="form" onSubmit={handleAddRole} sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <TextField label="Role Name" size="small" required value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })} sx={{ flexGrow: 1, minWidth: 200 }} />
          <TextField label="Description" size="small" value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} sx={{ flexGrow: 2, minWidth: 300 }} />
          <Button type="submit" variant="contained" color="primary" disabled={saving}>{saving ? 'Saving...' : 'New Role'}</Button>
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Select Permissions:</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {permissions.map(permission => (
            <Chip
              key={permission.ID}
              label={`${permission.Module}: ${permission.Name}`}
              onClick={() => togglePermission(permission.ID)}
              color={selectedPermissions.includes(permission.ID) ? 'primary' : 'default'}
              variant={selectedPermissions.includes(permission.ID) ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      </Paper>

      <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'primary.main' }}>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ backgroundColor: 'primary.light' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Permissions</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map(role => (
                <TableRow key={role.ID} hover>
                  <TableCell>{role.Name}</TableCell>
                  <TableCell>{role.Description}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {role.Permissions?.map(p => (
                        <Chip key={p.ID} label={p.Name} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Button size="small" color="error" onClick={() => handleDeleteRole(role.ID)}>Delete</Button>
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

export default AdminRoles;
