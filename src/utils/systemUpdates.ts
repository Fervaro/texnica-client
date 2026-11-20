export interface SystemUpdateChange {
  title: string;
  description: string;
}

export const systemUpdates = {
  id: '2026-11-20',
  date: '20 de noviembre de 2026',
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
      description: 'Se agregaron cajas IRR y FQ, con sus cantidades visibles en Warehouse. Las cajas FQ pueden tomar piezas de varias FGPO compatibles.',
    },
    {
      title: 'Cajas Mix y embarques',
      description: 'El detalle de Mix muestra su composición por talla y se valida la asignación a embarques antes de eliminar una caja.',
    },
  ] satisfies SystemUpdateChange[],
};
