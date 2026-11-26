import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContextValue';

export const useModulePermissions = (module: string) => {
  const { hasPermission, permissionsLoading } = useContext(AuthContext);

  return {
    hasPermission,
    canView: hasPermission(module, 'VER'),
    canCreate: hasPermission(module, 'CREAR'),
    canEdit: hasPermission(module, 'EDITAR'),
    canVoid: hasPermission(module, 'ANULAR'),
    canAdminister: hasPermission(module, 'ADMINISTRAR'),
    permissionsLoading,
  };
};
