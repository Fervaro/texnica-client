import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Contrato mínimo que debe cumplir el objeto de API de un recurso
 * para ser consumido por el hook genérico useResource.
 */
export interface ApiResource {
  getPaged: (params: any) => Promise<any>;
  getAll?: () => Promise<any>;
  getById?: (id: number) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: number, data: any) => Promise<any>;
  delete: (id: number) => Promise<any>;
}

export interface UseResourceResult<T> {
  items: T[];
  loading: boolean;
  saving: boolean;
  error: string;
  page: number;
  rowsPerPage: number;
  totalCount: number;
  search: string;
  setPage: (p: number) => void;
  setRowsPerPage: (n: number) => void;
  setSearchQuery: (s: string) => void;
  setError: (msg: string) => void;
  load: () => Promise<void>;
  refresh: () => Promise<void>;
  create: (data: any) => Promise<void>;
  update: (id: number, data: any) => Promise<void>;
  remove: (id: number) => Promise<void>;
  getById: (id: number) => Promise<T | null>;
}

/**
 * Hook genérico de CRUD + paginación + búsqueda para cualquier recurso.
 * Consume los endpoints (getPaged/create/update/delete) con React hooks.
 */
export function useResource<T>(
  api: ApiResource,
  mapItem?: (raw: any) => T
): UseResourceResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const normalize = useMemo(() => mapItem ?? ((x: any) => x as T), [mapItem]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getPaged({ page: page + 1, pageSize: rowsPerPage, search });
      setItems((res.data?.items ?? []).map(normalize));
      setTotalCount(res.data?.totalCount ?? 0);
    } catch (err: any) {
      setError(err.response?.data || err.message || 'Error cargando datos.');
    } finally {
      setLoading(false);
    }
  }, [api, page, rowsPerPage, search, normalize]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (data: any) => {
      setSaving(true);
      try {
        await api.create(data);
        await load();
      } finally {
        setSaving(false);
      }
    },
    [api, load]
  );

  const update = useCallback(
    async (id: number, data: any) => {
      setSaving(true);
      try {
        await api.update(id, data);
        await load();
      } finally {
        setSaving(false);
      }
    },
    [api, load]
  );

  const remove = useCallback(
    async (id: number) => {
      setSaving(true);
      try {
        await api.delete(id);
        await load();
      } finally {
        setSaving(false);
      }
    },
    [api, load]
  );

  const getById = useCallback(
    async (id: number) => {
      if (!api.getById) return null;
      try {
        const res = await api.getById(id);
        return normalize(res.data);
      } catch {
        return null;
      }
    },
    [api, normalize]
  );

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const setSearchQuery = useCallback((s: string) => {
    setSearch(s);
    setPage(0);
  }, []);

  return {
    items,
    loading,
    saving,
    error,
    page,
    rowsPerPage,
    totalCount,
    search,
    setPage,
    setRowsPerPage,
    setSearchQuery,
    setError,
    load,
    refresh,
    create,
    update,
    remove,
    getById,
  };
}
