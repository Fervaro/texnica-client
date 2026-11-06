import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Captura errores de render no controlados para evitar que la app quede en
 * blanco o "congelada". Muestra un mensaje y un botón para recargar.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown) {
    // Registro local: en producción conviene enviarlo a un servicio de telemetría.
    console.error('Unhandled render error:', error);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, bgcolor: 'background.default' }}>
        <Paper elevation={3} sx={{ p: 4, maxWidth: 480, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Something went wrong
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            An unexpected error occurred. Reload the page to continue.
          </Typography>
          {this.state.message && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3, wordBreak: 'break-word' }}>
              {this.state.message}
            </Typography>
          )}
          <Button variant="contained" onClick={this.handleReload}>
            Reload
          </Button>
        </Paper>
      </Box>
    );
  }
}
