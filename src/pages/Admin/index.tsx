import React, { useContext, useState, FormEvent } from 'react';
import { DataContext } from '../../context/DataContext';
import { 
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Button, TextField, Select, MenuItem, FormControl, InputLabel, Stack, Chip,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const Admin: React.FC = () => {
  const { users, roles, addUser, addRole } = useContext(DataContext);
  
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Administrator' });
  const [newRole, setNewRole] = useState({ name: '', description: '' });

  const handleAddUser = (e: FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;
    addUser(newUser);
    setNewUser({ name: '', email: '', role: 'Administrator' });
  };

  const handleAddRole = (e: FormEvent) => {
    e.preventDefault();
    if (!newRole.name) return;
    addRole({ Name: newRole.name, Description: newRole.description, Active: true, Permissions: [] });
    setNewRole({ name: '', description: '' });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
        Administration Module
      </Typography>
      
      <Stack spacing={3}>
        
        {/* USERS SECTION */}
        <Accordion defaultExpanded elevation={2} sx={{ borderTop: 4, borderColor: 'primary.main' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PeopleIcon color="primary" />
              <Typography variant="h6">Users</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
          
          <Box component="form" onSubmit={handleAddUser} sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
            <TextField 
              label="Name" size="small" variant="outlined"
              value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}
              sx={{ flexGrow: 1, minWidth: 200 }}
            />
            <TextField 
              label="Email" type="email" size="small" variant="outlined"
              value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
              sx={{ flexGrow: 1, minWidth: 200 }}
            />
            <FormControl size="small" sx={{ flexGrow: 1, minWidth: 200 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={newUser.role} label="Role"
                onChange={e => setNewUser({...newUser, role: e.target.value as string})}
              >
                {roles.map(r => <MenuItem key={r.ID} value={r.Name}>{r.Name}</MenuItem>)}
              </Select>
            </FormControl>
            <Button type="submit" variant="contained" color="primary">New User</Button>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead sx={{ backgroundColor: 'primary.light' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.status} 
                        size="small" 
                        color={user.status === 'Active' ? 'success' : 'primary'} 
                        variant="outlined" 
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          </AccordionDetails>
        </Accordion>

        {/* ROLES SECTION */}
        <Accordion defaultExpanded elevation={2} sx={{ borderTop: 4, borderColor: 'primary.main' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon color="primary" />
              <Typography variant="h6">Roles & Permissions</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
          
          <Box component="form" onSubmit={handleAddRole} sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
            <TextField 
              label="Role Name" size="small" variant="outlined"
              value={newRole.name} onChange={e => setNewRole({...newRole, name: e.target.value})}
              sx={{ flexGrow: 1, minWidth: 200 }}
            />
            <TextField 
              label="Description" size="small" variant="outlined"
              value={newRole.description} onChange={e => setNewRole({...newRole, description: e.target.value})}
              sx={{ flexGrow: 2, minWidth: 200 }}
            />
            <Button type="submit" variant="contained" color="primary">New Role</Button>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead sx={{ backgroundColor: 'primary.light' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Permissions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map(role => (
                  <TableRow key={role.ID} hover>
                    <TableCell>{role.Name}</TableCell>
                    <TableCell>{role.Permissions?.length ? role.Permissions.map(p => p.Name).join(', ') : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          </AccordionDetails>
        </Accordion>

      </Stack>
    </Box>
  );
};

export default Admin;
