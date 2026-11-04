// Tipos comunes del sistema

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Opción genérica para selects/autocompletes */
export interface SelectOption {
  id: number;
  label: string;
  sub?: string;
  /** Proveedor (para opciones de Fabric PO) */
  supplier?: string;
  /** FGPO al que pertenece la opción (para filtrar Lotes). */
  fgpoId?: number;
}

/** Catálogo maestro: { Type: [values...] } */
export type CatalogsMap = Record<string, string[]>;
