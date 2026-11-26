import { useModulePermissions } from '../../hooks/permissions/useModulePermissions';
import React, { useState, useEffect, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, TablePagination, Tooltip
} from '@mui/material';
import FactoryIcon from '@mui/icons-material/Factory';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { factoriesApi } from '../../utils/api';

interface Factory {
  ID: number;
  Name: string;
  Location?: string;
  Contact?: string;
  Phone?: string;
  Email?: string;
  Active: boolean;
  CreatedAt: string;
  UpdatedAt?: string;
}

interface FactoryForm {
  Name: string;
  Location: string;
  Contact: string;
  Phone: string;
  Email: string;
}

const emptyForm: FactoryForm = {
  Name: '',
  Location: '',
  Contact: '',
  Phone: '',
  Email: '',
};

// Map the API response (camelCase) to the PascalCase interface used by the UI
const mapFactory = (raw: any): Factory => ({
  ID: raw.id ?? raw.ID,
  Name: raw.name ?? raw.Name ?? '',
  Location: raw.location ?? raw.Location,
  Contact: raw.contact ?? raw.Contact,
  Phone: raw.phone ?? raw.Phone,
  Email: raw.email ?? raw.Email,
  Active: raw.active ?? raw.Active ?? true,
  CreatedAt: raw.createdAt ?? raw.CreatedAt ?? '',
  UpdatedAt: raw.updatedAt ?? raw.UpdatedAt,
});

const Factories: React.FC = () => {
  const modulePermissions = useModulePermissions('Factories');
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Search
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FactoryForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchFactories = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {
        page: page + 1,
        pageSize,
      };
      if (search) params.search = search;
      const res = await factoriesApi.getPaged(params);
      const data = res.data;
      setFactories((data.items ?? []).map(mapFactory));
      setTotalCount(data.totalCount ?? 0);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error loading factories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFactories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search]);

  const handleSearch = () => {
    setPage(0);
    setSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(0);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (factory: Factory) => {
    setEditingId(factory.ID);
    setForm({
      Name: factory.Name,
      Location: factory.Location ?? '',
      Contact: factory.Contact ?? '',
      Phone: factory.Phone ?? '',
      Email: factory.Email ?? '',
    });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.Name.trim()) {
      setFormError('Name is required.');
      return;
    }
    setSaving(true);
    try {
      if (editingId === null) {
        await factoriesApi.create(form);
        setSuccess('Factory created successfully.');
      } else {
        await factoriesApi.update(editingId, form);
        setSuccess('Factory updated successfully.');
      }
      setDialogOpen(false);
      setPage(0);
      fetchFactories();
    } catch (err: any) {
      setFormError(err?.response?.data ?? 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (id: number) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await factoriesApi.delete(deleteId);
      setSuccess('Factory deleted successfully.');
      setDeleteOpen(false);
      fetchFactories();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error deleting factory.');
      setDeleteOpen(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <FactoryIcon color="primary" />
        <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold' }}>Factories</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper elevation={2} sx={{ p: 3, borderTop: 4, borderColor: 'primary.main' }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Search"
            size="small"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            sx={{ flexGrow: 1, minWidth: 250 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon /></InputAdornment>
                ),
                endAdornment: searchInput ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}><ClearIcon /></IconButton>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
          <Button variant="contained" color="primary" onClick={handleSearch}>Search</Button>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} disabled={!modulePermissions.canCreate} onClick={openCreate}>New Factory</Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ backgroundColor: 'primary.light' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Location</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Contact</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {factories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">No factories found.</TableCell>
                    </TableRow>
                  ) : (
                    factories.map(factory => (
                      <TableRow key={factory.ID} hover>
                        <TableCell>{factory.Name}</TableCell>
                        <TableCell>{factory.Location ?? '-'}</TableCell>
                        <TableCell>{factory.Contact ?? '-'}</TableCell>
                        <TableCell>{factory.Phone ?? '-'}</TableCell>
                        <TableCell>{factory.Email ?? '-'}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" color="primary" disabled={!modulePermissions.canEdit} onClick={() => openEdit(factory)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => openDelete(factory.ID)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={e => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </>
        )}
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId === null ? 'New Factory' : 'Edit Factory'}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField label="Name" size="small" required value={form.Name} onChange={e => setForm({ ...form, Name: e.target.value })} />
            <TextField label="Location" size="small" value={form.Location} onChange={e => setForm({ ...form, Location: e.target.value })} />
            <TextField label="Contact" size="small" value={form.Contact} onChange={e => setForm({ ...form, Contact: e.target.value })} />
            <TextField label="Phone" size="small" value={form.Phone} onChange={e => setForm({ ...form, Phone: e.target.value })} />
            <TextField label="Email" size="small" value={form.Email} onChange={e => setForm({ ...form, Email: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary" disabled={saving || !(editingId ? modulePermissions.canEdit : modulePermissions.canCreate)} onClick={handleSubmit}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete Factory</DialogTitle>
        <DialogContent>Are you sure you want to delete this factory?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" disabled={!modulePermissions.canVoid} onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Factories;
