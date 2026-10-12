import React, { useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Select, MenuItem, FormControl, InputLabel, Paper, Chip, CircularProgress, Alert, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import { useAdminUsuarios } from '../../hooks/AdminUsuarios/useAdminUsuarios';

const AdminUsuarios: React.FC = () => {
  const {
    users,
    roles,
    customers,
    loading,
    error,
    newUser,
    snackbar,
    defaultPassword,
    setNewUser,
    setSnackbar,
    handleCreateUser,
    handleAssignRole,
    handleUpdateUser,
    handleResetPassword,
    handleSetActive,
  } = useAdminUsuarios();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const openEdit = (user: any) => {
    setEditingUser(user);
    setEditForm({ userName: user.userName, userEmail: user.userEmail, userType: user.userType || 'Employee', customerId: user.customerId || 0, roleId: user.roleId || '' });
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try { await handleCreateUser(e); } finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await handleUpdateUser(editingUser.id, editForm);
      setEditingUser(null);
    } finally { setSaving(false); }
  };

  const resetPassword = async (user: any) => {
    const password = window.prompt('New password (leave blank to use "inicio"):');
    if (password === null) return;
    await handleResetPassword(user.id, password || undefined);
  };

  const toggleActive = async (user: any) => {
    const action = user.active ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    await handleSetActive(user.id, !user.active);
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <PeopleIcon color="primary" />
        <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold' }}>Users</Typography>
      </Box>

      <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'primary.main' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Add new user</Typography>
        <Box component="form" onSubmit={handleSubmitCreate} sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <TextField label="Full Name" size="small" required value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} sx={{ flexGrow: 1, minWidth: 200 }} />
          <TextField label="Email" type="email" size="small" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} sx={{ flexGrow: 1, minWidth: 200 }} />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Role</InputLabel>
            <Select label="Role" value={roles.some(role => role.id === newUser.roleId) ? newUser.roleId : ''} onChange={e => setNewUser({ ...newUser, roleId: e.target.value as number })}>
              {roles.map(r => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>User Type</InputLabel>
            <Select label="User Type" value={newUser.userType} onChange={e => setNewUser({ ...newUser, userType: e.target.value as 'Employee' | 'Client', customerId: 0 })}>
              <MenuItem value="Employee">Employee</MenuItem>
              <MenuItem value="Client">Client</MenuItem>
            </Select>
          </FormControl>
          {newUser.userType === 'Client' && (
            <FormControl size="small" required sx={{ minWidth: 220 }}>
              <InputLabel>Customer</InputLabel>
              <Select label="Customer" value={newUser.customerId || ''} onChange={e => setNewUser({ ...newUser, customerId: Number(e.target.value) })}>
                {customers.map(customer => <MenuItem key={customer.id} value={customer.id}>{customer.name}</MenuItem>)}
              </Select>
            </FormControl>
          )}
          <Button type="submit" variant="contained" color="primary" disabled={saving}>{saving ? 'Saving...' : 'New User'}</Button>
        </Box>

        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          New users are created with the default password <strong>"{defaultPassword}"</strong>. On first login, the system will prompt them to create their own password.
        </Alert>

        <TableContainer>
          <Table size="small">
            <TableHead sx={{ backgroundColor: 'primary.light' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Type / Customer</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.userName}</TableCell>
                  <TableCell>{user.userEmail}</TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <Select
                        value={user.roleId || ''}
                        onChange={(e) => handleAssignRole(user.id, e.target.value as number)}
                        displayEmpty
                      >
                        <MenuItem value="">No Role</MenuItem>
                        {roles.map(r => (
                          <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>{user.userType} {user.customerName ? ` / ${user.customerName}` : ''}</TableCell>
                  <TableCell>
                    <Chip label={user.active ? 'Active' : 'Inactive'} color={user.active ? 'success' : 'default'} size="small" variant="outlined" />
                  </TableCell>

                  <TableCell>
                    <Button size="small" variant="outlined" onClick={() => openEdit(user)}>Edit</Button>{' '}
                    <Button size="small" variant="outlined" onClick={() => resetPassword(user)}>Reset Password</Button>{' '}
                    <Button size="small" color={user.active ? 'error' : 'success'} onClick={() => toggleActive(user)}>
                      {user.active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={!!editingUser} onClose={() => setEditingUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="Username" value={editForm.userName || ''} onChange={e => setEditForm({ ...editForm, userName: e.target.value })} required />
          <TextField label="Email" type="email" value={editForm.userEmail || ''} onChange={e => setEditForm({ ...editForm, userEmail: e.target.value })} required />
          <FormControl size="small"><InputLabel>User Type</InputLabel><Select label="User Type" value={editForm.userType || 'Employee'} onChange={e => setEditForm({ ...editForm, userType: e.target.value, customerId: 0 })}><MenuItem value="Employee">Employee</MenuItem><MenuItem value="Client">Client</MenuItem></Select></FormControl>
          {editForm.userType === 'Client' && <FormControl size="small" required><InputLabel>Customer</InputLabel><Select label="Customer" value={editForm.customerId || ''} onChange={e => setEditForm({ ...editForm, customerId: Number(e.target.value) })}>{customers.map(customer => <MenuItem key={customer.id} value={customer.id}>{customer.name}</MenuItem>)}</Select></FormControl>}
          <FormControl size="small"><InputLabel>Role</InputLabel><Select label="Role" value={editForm.roleId || ''} onChange={e => setEditForm({ ...editForm, roleId: Number(e.target.value) })}>{roles.map(role => <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>)}</Select></FormControl>
        </DialogContent>
        <DialogActions><Button onClick={() => setEditingUser(null)}>Cancel</Button><Button variant="contained" onClick={saveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button></DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={() => setSnackbar('')}
        message={snackbar}
      />
    </Box>
  );
};

export default AdminUsuarios;
