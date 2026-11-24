export interface SystemUpdateChange {
  title: string;
  description: string;
}

export const systemUpdates = {
  id: '2026-11-24',
  date: '24 de noviembre de 2026',
  changes: [
    {
      title: 'Salidas de tela desde Excel',
      description: 'La importación identifica cada rollo por su ID, procesa las líneas válidas y permite descargar las líneas que requieren revisión.',
    },
    {
      title: 'Trazabilidad de tela por PO',
      description: 'Los movimientos muestran la PO de destino y la fecha de uso registrada en el archivo de salidas.',
    },
    {
      title: 'Cajas especiales de Packing Control',
      description: 'Las cajas IRR y FQ muestran sus cantidades en Warehouse. Las FQ completas quedan disponibles para Shipment; las FQ parciales deben agruparse en una caja antes de embarcarse.',
    },
    {
      title: 'Registro y edición de FQ',
      description: 'Packing Control permite registrar y editar por separado las cantidades FQ en cajas y las piezas FQ parciales.',
    },
    {
      title: 'Capacidad de cajas Mix e IRR',
      description: 'La capacidad sugerida por FGPO se puede ajustar manualmente al crear cajas Mix e IRR; se conserva la validación de piezas disponibles.',
    },
    {
      title: 'Cajas Mix y embarques',
      description: 'El detalle de Mix muestra su composición por talla y se valida la asignación a embarques antes de eliminar una caja.',
    },
  ] satisfies SystemUpdateChange[],
};
