/**
 * Convierte un error de axios en un mensaje amigable para el usuario.
 * - 403 → "No se posee acceso a este Módulo." (sin permiso).
 * - Error con { message } en el body → ese mensaje.
 * - Body string → ese texto.
 * - Si no, usa err.message o el fallback.
 */
export function errorMessage(err: any, fallback = 'Error'): string {
  if (err?.response?.status === 403) {
    return 'No se posee acceso a este Módulo.';
  }
  const data = err?.response?.data;
  if (typeof data === 'string' && data.trim()) {
    return data;
  }
  if (data && typeof data === 'object' && data.message) {
    return String(data.message);
  }
  return err?.message || fallback;
}
