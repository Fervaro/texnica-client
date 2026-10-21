import React, { useState } from 'react';
import { Box, Paper, Tabs, Tab } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import FabricInventory from '../FabricInventory';
import FabricShipment from '../FabricShipment';
import FabricReceiving from '../FabricReceiving';
import RollReceiving from '../RollReceiving';
import FabricMovements from '../FabricMovements';
import FabricReservation from '../FabricReservation';

const TABS = [
  { key: 'inventory', label: 'Control de Tela', icon: <Inventory2Icon fontSize="small" /> },
  { key: 'shipments', label: 'Embarques y Lotes', icon: <LocalShippingIcon fontSize="small" /> },
  { key: 'receivings', label: 'Recepciones', icon: <MoveToInboxIcon fontSize="small" /> },
  { key: 'rolls', label: 'Inventario Físico de Tela', icon: <AllInboxIcon fontSize="small" /> },
  { key: 'movements', label: 'Movimientos', icon: <SwapHorizIcon fontSize="small" /> },
  { key: 'reservations', label: 'Reservas', icon: <BookmarkAddIcon fontSize="small" /> },
];

/**
 * Centro de gestión de telas: integra inventario, embarques/lotes, recepciones,
 * rollos, movimientos y reservas en una única pantalla con pestañas.
 * Reutiliza los componentes de página existentes (no hay implementaciones paralelas).
 */
const FabricInventoryHub: React.FC = () => {
  const [tab, setTab] = useState('inventory');

  return (
    <Box>
      <Paper elevation={2} sx={{ mb: 2, borderTop: 4, borderColor: 'primary.main' }}>
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ px: 1, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48 } }}
        >
          {TABS.map(t => (
            <Tab key={t.key} value={t.key} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Paper>

      <Box>
        {tab === 'inventory' && <FabricInventory />}
        {tab === 'shipments' && <FabricShipment />}
        {tab === 'receivings' && <FabricReceiving />}
        {tab === 'rolls' && <RollReceiving />}
        {tab === 'movements' && <FabricMovements />}
        {tab === 'reservations' && <FabricReservation />}
      </Box>
    </Box>
  );
};

export default FabricInventoryHub;
