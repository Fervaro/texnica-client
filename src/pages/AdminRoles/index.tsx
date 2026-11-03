import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import {
  Box, Typography, Paper, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress, Alert,
  Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, Checkbox,
  Tooltip, Stack,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import LockIcon from '@mui/icons-material/Lock';
import EditIcon from '@mui/icons-material/Edit';
import KeyIcon from '@mui/icons-material/VpnKey';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { rolesApi, permissionsApi, usersApi } from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';

const SUPER_ADMIN = 'super admin';
const ACTION_ORDER = ['VER', 'CREAR', 'EDITAR', 'ANULAR', 'APROBAR', 'ADMINISTRAR'];

interface PermissionItem {
  id: number;
  name: string;
  description: string;
  module: string;
  active: boolean;
}

interface RoleItem {
  id: number;
  name: string;
  description: string;
  active: boolean;
  permissions: PermissionItem[];
}

interface UserItem {
  id: number;
  roleId?: number | null;
  roleName?: string;
}

const AdminRoles: React.FC = () => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);

  // Create / edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoleItem | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  // Permissions matrix dialog
  const [permOpen, setPermOpen] = useState(false);
  const [permRole, setPermRole] = useState<RoleItem | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [savingPerms, setSavingPerms] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isSuperAdmin = useCallback((role: RoleItem) => role.name.trim().toLowerCase() === SUPER_ADMIN, []);

  // Rol del usuario autenticado (para habilitar la gestión del rol Super Admin solo al Super Admin).
  const { user } = useContext(AuthContext);
  const currentRoleName = useMemo(() => {
    if (user == null) return undefined;
    return users.find((u) => String(u.id) === String(user.id))?.roleName;
  }, [user, users]);
  const isCurrentSuperAdmin = (currentRoleName ?? '').trim().toLowerCase() === SUPER_ADMIN;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rolesRes, permissionsRes, usersRes] = await Promise.all([
        rolesApi.getAll(),
        permissionsApi.getAll(),
        usersApi.getAll(),
      ]);
      setRoles(rolesRes.data ?? []);
      setPermissions((permissionsRes.data ?? []).filter((p: PermissionItem) => p.active !== false));
      setUsers(usersRes.data ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
    setFormOpen(true);
  };

  const openEdit = (role: RoleItem) => {
    if (isSuperAdmin(role) && !isCurrentSuperAdmin) return;
    setEditing(role);
    setForm({ name: role.name, description: role.description });
    setFormOpen(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await rolesApi.update(editing.id, { name: form.name.trim(), description: form.description.trim() });
        setSnackbar({ severity: 'success', message: 'Role updated successfully.' });
      } else {
        await rolesApi.create({ name: form.name.trim(), description: form.description.trim() });
        setSnackbar({ severity: 'success', message: 'Role created successfully.' });
      }
      setFormOpen(false);
      await loadData();
    } catch (err: any) {
      setSnackbar({ severity: 'error', message: err?.response?.data?.message || 'Failed to save role.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (role: RoleItem) => {
    if (isSuperAdmin(role) && !isCurrentSuperAdmin) return;
    if (!window.confirm(`Are you sure you want to deactivate the role "${role.name}"?`)) return;
    try {
      await rolesApi.delete(role.id);
      setSnackbar({ severity: 'success', message: 'Role deactivated successfully.' });
      await loadData();
    } catch (err: any) {
      setSnackbar({ severity: 'error', message: err?.response?.data?.message || 'Failed to deactivate role.' });
    }
  };

  const openPermissions = (role: RoleItem) => {
    if (isSuperAdmin(role) && !isCurrentSuperAdmin) return;
    setPermRole(role);
    setSelected(new Set((role.permissions ?? []).map((p) => p.id)));
    setPermOpen(true);
  };

  const togglePermission = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const requestSavePermissions = () => setConfirmOpen(true);

  const savePermissions = async () => {
    if (!permRole || savingPerms) return;
    setSavingPerms(true);
    try {
      await rolesApi.assignPermissions(permRole.id, Array.from(selected));
      setSnackbar({ severity: 'success', message: 'Permissions saved successfully.' });
      setConfirmOpen(false);
      setPermOpen(false);
      await loadData();
    } catch (err: any) {
      setSnackbar({ severity: 'error', message: err?.response?.data?.message || 'Failed to save permissions.' });
      setConfirmOpen(false);
    } finally {
      setSavingPerms(false);
    }
  };

  // Permissions matrix: modules + action columns present in the catalog
  const modules = useMemo(() => {
    const map = new Map<string, PermissionItem[]>();
    for (const p of permissions) {
      if (!map.has(p.module)) map.set(p.module, []);
      map.get(p.module)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [permissions]);

  const actionColumns = useMemo(() => {
    const present = new Set(permissions.map((p) => p.name));
    return ACTION_ORDER.filter((a) => present.has(a));
  }, [permissions]);

  const permByModuleAction = useMemo(() => {
    const map = new Map<string, PermissionItem>();
    for (const p of permissions) map.set(`${p.module}|${p.name}`, p);
    return map;
  }, [permissions]);

  const userCountByRole = useMemo(() => {
    const map = new Map<number, number>();
    for (const u of users) {
      if (u.roleId != null) map.set(u.roleId, (map.get(u.roleId) ?? 0) + 1);
    }
    return map;
  }, [users]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon color="primary" />
          <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold' }}>Roles & Permissions</Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openCreate}>
          New Role
        </Button>
      </Box>

      <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'primary.main' }}>
        <TableContainer sx={{ maxHeight: 560 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.light' }}>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', minWidth: 200 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', minWidth: 240 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Users</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Permissions</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', minWidth: 260 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((role) => {
                const protectedRole = isSuperAdmin(role) && !isCurrentSuperAdmin;
                const permCount = (role.permissions ?? []).length;
                return (
                  <TableRow key={role.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography sx={{ fontWeight: 600 }}>{role.name}</Typography>
                        {protectedRole && (
                          <Tooltip title="Protected role: only Super Admin can manage it.">
                            <LockIcon fontSize="small" color="action" />
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>{role.description || '—'}</TableCell>
                    <TableCell>
                      <Chip label={userCountByRole.get(role.id) ?? 0} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip label={permCount} size="small" color={permCount > 0 ? 'primary' : 'default'} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => openEdit(role)}
                          disabled={protectedRole}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<KeyIcon />}
                          onClick={() => openPermissions(role)}
                          disabled={protectedRole}
                        >
                          Permissions
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeactivate(role)}
                          disabled={protectedRole}
                        >
                          Deactivate
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              {roles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">No roles found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Role' : 'New Role'}</DialogTitle>
        <Box component="form" onSubmit={submitForm}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Role Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextField
              label="Description"
              multiline
              minRows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Permissions matrix dialog */}
      <Dialog open={permOpen} onClose={() => setPermOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Permissions — {permRole?.name}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Select the actions allowed for this role, organized by module.
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.light' }}>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', minWidth: 200 }}>Module</TableCell>
                  {actionColumns.map((action) => (
                    <TableCell key={action} align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {action}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {modules.map(([module]) => (
                  <TableRow key={module} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{module}</TableCell>
                    {actionColumns.map((action) => {
                      const perm = permByModuleAction.get(`${module}|${action}`);
                      if (!perm) return <TableCell key={action} align="center">—</TableCell>;
                      return (
                        <TableCell key={action} align="center">
                          <Checkbox
                            checked={selected.has(perm.id)}
                            onChange={() => togglePermission(perm.id)}
                            color="primary"
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto', pl: 2 }}>
            {selected.size} permission(s) selected
          </Typography>
          <Button onClick={() => setPermOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={requestSavePermissions} disabled={savingPerms}>
            {savingPerms ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm before saving permissions */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Save permissions?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            You are about to save <strong>{selected.size}</strong> permission(s) for the role{' '}
            <strong>{permRole?.name}</strong>. This will replace the current assignment.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={savePermissions} disabled={savingPerms}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

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

export default AdminRoles;
