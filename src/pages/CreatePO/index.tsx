import React, { useState, useEffect, FormEvent, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, TextField, Button, Grid, Alert, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { fgpoApi, customersApi } from '../../utils/api';
import { getCurrentUserName } from '../../utils/session';
import { AuthContext } from '../../context/AuthContext';

const STATUS_OPTIONS = [
  'Not Started', 'Pending', 'In Progress', 'Partially Completed', 'Completed',
  'Approved', 'Conditionally Approved', 'Rejected', 'On Hold', 'Closed', 'Cancelled', 'FGPO Pending'
];

const emptyForm = {
  FGPONumber: '', TemporaryNumber: '', Status: 'Pending', CustomerId: 0,
  OrderQuantity: 0, DeliveryDate: '', DataOwnerId: 0, Remarks: '',
};

const CreatePO: React.FC = () => {
  const navigate = useNavigate();
  const { selectedCustomer } = useContext(AuthContext);
  const [customers, setCustomers] = useState<{ ID: number; Name: string }[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedCustomer) {
      setForm(prev => ({ ...prev, CustomerId: selectedCustomer.id }));
    }
  }, [selectedCustomer]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await customersApi.getAll();
        setCustomers((res.data ?? []).map((c: any) => ({ ID: c.id ?? c.ID, Name: c.name ?? c.Name })));
      } catch { /* mantiene vacío */ }
    };
    load();
  }, []);

  const setF = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (form.Status === 'FGPO Pending' && !form.TemporaryNumber.trim()) {
      setFormError('Temporary Order ID is required when status is FGPO Pending.'); return;
    }
    if (form.Status !== 'FGPO Pending' && !form.FGPONumber.trim()) {
      setFormError('FGPO Number is required.'); return;
    }
    if (!form.CustomerId) { setFormError('Customer is required.'); return; }
    if (!form.DeliveryDate) { setFormError('Delivery Date is required.'); return; }
    if (form.OrderQuantity <= 0) { setFormError('Order Quantity must be greater than 0.'); return; }

    setSaving(true);
    try {
      await fgpoApi.create({
        ...form,
        CustomerId: form.CustomerId,
        DataOwnerId: form.DataOwnerId || null,
        DeliveryDate: new Date(form.DeliveryDate).toISOString(),
      });
      navigate('/fgpo');
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to create FGPO.');
    } finally { setSaving(false); }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 760, borderTop: 4, borderColor: 'primary.main' }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Create New FGPO (Customer Order)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Crea una orden de producción real (FGPO) que alimenta los módulos de fabricación y embarques.
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            {formError && <Grid size={{ xs: 12 }}><Alert severity="error">{formError}</Alert></Grid>}

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="FGPO Number" fullWidth required value={form.FGPONumber}
                onChange={e => setF('FGPONumber', e.target.value)} placeholder="Ex. FPO-2026-003"
                disabled={form.Status === 'FGPO Pending'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Temporary Order ID" fullWidth value={form.TemporaryNumber}
                onChange={e => setF('TemporaryNumber', e.target.value)}
                placeholder="Solo si estado es FGPO Pending" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="medium">
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={form.Status} onChange={e => setF('Status', e.target.value)}>
                  {STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="medium">
                <InputLabel>Customer *</InputLabel>
                <Select label="Customer *" value={form.CustomerId || ''} disabled onChange={e => setF('CustomerId', Number(e.target.value))}>
                  {selectedCustomer ? (
                    <MenuItem value={selectedCustomer.id}>{selectedCustomer.name}</MenuItem>
                  ) : (
                    <>
                      <MenuItem value=""><em>Select a customer...</em></MenuItem>
                      {customers.map(c => <MenuItem key={c.ID} value={c.ID}>{c.Name}</MenuItem>)}
                    </>
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Order Quantity *" fullWidth type="number" required value={form.OrderQuantity}
                onChange={e => setF('OrderQuantity', Number(e.target.value))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Delivery Date *" fullWidth type="date" required value={form.DeliveryDate}
                onChange={e => setF('DeliveryDate', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="medium">
                <TextField label="Data Owner" value={getCurrentUserName()} slotProps={{ input: { readOnly: true } }} />
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Remarks" fullWidth multiline rows={2} value={form.Remarks}
                onChange={e => setF('Remarks', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
              <Button onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Creating...' : 'Create FGPO'}</Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

export default CreatePO;
