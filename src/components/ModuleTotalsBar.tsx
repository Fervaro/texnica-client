import { Grid, Paper, Typography } from '@mui/material';

export interface ModuleTotalItem {
  label: string;
  value: string;
  color?: string;
  /** Sufijo por item; sobrescribe el sufijo global. Usa '' para no mostrar ninguno. */
  suffix?: string;
}

/** Barra compacta de indicadores de un módulo (totales provenientes del backend). */
const ModuleTotalsBar: React.FC<{ items: ModuleTotalItem[]; suffix?: string }> = ({ items, suffix }) => (
  <Grid container spacing={1.5} sx={{ mb: 2 }}>
    {items.map((it) => {
      const s = it.suffix !== undefined ? it.suffix : (suffix ?? '');
      return (
        <Grid size={{ xs: 6, sm: 4, md: 2 }} key={it.label}>
          <Paper elevation={1} sx={{ p: 1, borderTop: 3, borderColor: it.color ?? 'primary.main' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{it.label}</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2, color: it.color ?? 'inherit' }}>
              {it.value}{s ? ` ${s}` : ''}
            </Typography>
          </Paper>
        </Grid>
      );
    })}
  </Grid>
);

export default ModuleTotalsBar;
