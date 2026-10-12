import React, { useState, useEffect, FormEvent } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Paper, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, InputAdornment, TablePagination, Tooltip
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { customersApi } from '../../utils/api';

interface Customer {
  ID: number;
  Name: string;
  Contact?: string;
  Phone?: string;
  Email?: string;
  Address?: string;
  ShippingAddress?: string;
  Active: boolean;
  CreatedAt: string;
  UpdatedAt?: string;
}

interface CustomerForm {
  Name: string;
  Contact: string;
  Phone: string;
  Email: string;
  Address: string;
  ShippingAddress: string;
}

const emptyForm: CustomerForm = {
  Name: '',
  Contact: '',
  Phone: '',
  Email: '',
  Address: '',
  ShippingAddress: '',
};

// Map the API response (camelCase) to the PascalCase interface used by the UI
const mapCustomer = (raw: any): Customer => ({
  ID: raw.id ?? raw.ID,
  Name: raw.name ?? raw.Name ?? '',
  Contact: raw.contact ?? raw.Contact,
  Phone: raw.phone ?? raw.Phone,
  Email: raw.email ?? raw.Email,
  Address: raw.address ?? raw.Address,
  ShippingAddress: raw.shippingAddress ?? raw.ShippingAddress,
  Active: raw.active ?? raw.Active ?? true,
  CreatedAt: raw.createdAt ?? raw.CreatedAt ?? '',
  UpdatedAt: raw.updatedAt ?? raw.UpdatedAt,
});

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
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
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {
        page: page + 1,
        pageSize,
      };
      if (search) params.search = search;
      const res = await customersApi.getPaged(params);
      const data = res.data;
      setCustomers((data.items ?? []).map(mapCustomer));
      setTotalCount(data.totalCount ?? 0);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error loading customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
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

  const openEdit = (customer: Customer) => {
    setEditingId(customer.ID);
    setForm({
      Name: customer.Name,
      Contact: customer.Contact ?? '',
      Phone: customer.Phone ?? '',
      Email: customer.Email ?? '',
      Address: customer.Address ?? '',
      ShippingAddress: customer.ShippingAddress ?? '',
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
        await customersApi.create(form);
        setSuccess('Customer created successfully.');
      } else {
        await customersApi.update(editingId, form);
        setSuccess('Customer updated successfully.');
      }
      setDialogOpen(false);
      setPage(0);
      fetchCustomers();
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
      await customersApi.delete(deleteId);
      setSuccess('Customer deleted successfully.');
      setDeleteOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error deleting customer.');
      setDeleteOpen(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <BusinessIcon color="primary" />
        <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold' }}>Customers</Typography>
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
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openCreate}>New Customer</Button>
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
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Contact</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Address</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Shipping Address</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">No customers found.</TableCell>
                    </TableRow>
                  ) : (
                    customers.map(customer => (
                      <TableRow key={customer.ID} hover>
                        <TableCell>{customer.Name}</TableCell>
                        <TableCell>{customer.Contact ?? '-'}</TableCell>
                        <TableCell>{customer.Phone ?? '-'}</TableCell>
                        <TableCell>{customer.Email ?? '-'}</TableCell>
                        <TableCell>{customer.Address ?? '-'}</TableCell>
                        <TableCell>{customer.ShippingAddress ?? '-'}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" color="primary" onClick={() => openEdit(customer)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => openDelete(customer.ID)}>
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
        <DialogTitle>{editingId === null ? 'New Customer' : 'Edit Customer'}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField label="Name" size="small" required value={form.Name} onChange={e => setForm({ ...form, Name: e.target.value })} />
            <TextField label="Contact" size="small" value={form.Contact} onChange={e => setForm({ ...form, Contact: e.target.value })} />
            <TextField label="Phone" size="small" value={form.Phone} onChange={e => setForm({ ...form, Phone: e.target.value })} />
            <TextField label="Email" size="small" value={form.Email} onChange={e => setForm({ ...form, Email: e.target.value })} />
            <TextField label="General Address" size="small" value={form.Address} onChange={e => setForm({ ...form, Address: e.target.value })} />
            <TextField label="Shipping Address" size="small" value={form.ShippingAddress} onChange={e => setForm({ ...form, ShippingAddress: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary" disabled={saving} onClick={handleSubmit}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete Customer</DialogTitle>
        <DialogContent>Are you sure you want to delete this customer?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Customers;
