import { useResource } from '../useResource';
import { boxTypesApi } from '../../utils/api';
import { BoxType } from '../../types';

const mapBoxType = (raw: any): BoxType => ({
  id: raw.id ?? raw.ID ?? 0,
  boxCode: raw.boxCode ?? raw.BoxCode ?? '',
  length: raw.length ?? raw.Length ?? undefined,
  width: raw.width ?? raw.Width ?? undefined,
  height: raw.height ?? raw.Height ?? undefined,
  emptyCartonWeight: raw.emptyCartonWeight ?? raw.EmptyCartonWeight ?? undefined,
  style: raw.style ?? raw.Style ?? '',
  color: raw.color ?? raw.Color ?? '',
  size: raw.size ?? raw.Size ?? '',
  qtyPerBox: raw.qtyPerBox ?? raw.QtyPerBox ?? 0,
  comments: raw.comments ?? raw.Comments ?? '',
  active: raw.active ?? raw.Active ?? true,
  createdAt: raw.createdAt ?? raw.CreatedAt ?? '',
  updatedAt: raw.updatedAt ?? raw.UpdatedAt,
});

export const useBoxTypes = () => useResource<BoxType>(boxTypesApi, mapBoxType);
