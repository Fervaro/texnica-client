import React from 'react';
import {
  Box, Typography, Paper, Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Alert,
} from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';

interface ModulePlaceholderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  fields: string[];
  accent?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error';
  note?: string;
}

const MODULE_ACCENTS: Record<string, string> = {
  primary: 'primary.main',
  secondary: 'secondary.main',
  success: 'success.main',
  info: 'info.main',
  warning: 'warning.main',
  error: 'error.main',
};

/**
 * Ventana provisional para módulos que aún no se han desarrollado.
 * Muestra la estructura de campos definida en el master workbook (Excel)
 * para que el equipo vea qué contendrá el módulo cuando se implemente.
 */
const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  title,
  subtitle,
  icon,
  fields,
  accent = 'primary',
  note,
}) => {
  const accentColor = MODULE_ACCENTS[accent] ?? 'primary.main';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            <Box component="span" sx={{ mr: 1, verticalAlign: 'middle', color: accentColor }}>
              {icon}
            </Box>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Chip icon={<ConstructionIcon />} label="Module in development" color="warning" variant="outlined" />
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        This module is not yet implemented. The window shows the field structure defined in the
        master workbook (TPCS Integrated Master Control Workbook) for the team's reference.
      </Alert>

      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{ p: 2, backgroundColor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Expected data structure ({fields.length} fields)
          </Typography>
          {note && <Typography variant="caption" color="text.secondary">{note}</Typography>}
        </Box>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 600, width: 60 }}>#</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Field (per Excel)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fields.map((f, i) => (
                <TableRow key={f} hover>
                  <TableCell sx={{ color: 'text.secondary' }}>{i + 1}</TableCell>
                  <TableCell>{f}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ModulePlaceholder;
