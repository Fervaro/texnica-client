import axios from 'axios';


const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://tpcs-texnica.runasp.net/api',
  headers: {
    'Content-Type': 'application/json'
  }
});



// API Key: header exigido por el backend en /api/** — se lee únicamente del env
const API_KEY = import.meta.env.VITE_API_KEY;

// Interceptor to add the token + API key automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const selectedCustomer = localStorage.getItem('selectedCustomer');
    if (config.headers) {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (selectedCustomer) {
        const customer = JSON.parse(selectedCustomer);
        config.headers['X-Customer-Id'] = String(customer.id);

        if (config.params && typeof config.params === 'object') {
          config.params = { ...config.params, customerId: customer.id };
        }

        if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
          const storedUser = localStorage.getItem('user');
          const user = storedUser ? JSON.parse(storedUser) : null;
          const isUserCreation = config.url?.endsWith('/auth/users') === true;
          config.data = {
            ...config.data,
            ...(!isUserCreation && Object.prototype.hasOwnProperty.call(config.data, 'CustomerId')
              ? { CustomerId: config.data.CustomerId || customer.id }
              : {}),
            ...(Object.prototype.hasOwnProperty.call(config.data, 'DataOwnerId') && user?.id
              ? { DataOwnerId: Number(user.id) }
              : {}),
            ...(Object.prototype.hasOwnProperty.call(config.data, 'DataOwner') && user?.userName
              ? { DataOwner: user.userName }
              : {}),
          };
        }
      }
      config.headers['X-API-Key'] = API_KEY;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Roles API
export const rolesApi = {
  getAll: () => api.get('/roles'),
  getById: (id: number) => api.get(`/roles/${id}`),
  create: (data: any) => api.post('/roles', data),
  update: (id: number, data: any) => api.put(`/roles/${id}`, data),
  delete: (id: number) => api.delete(`/roles/${id}`),
  assignPermissions: (roleId: number, permissionIds: number[]) => 
    api.post(`/roles/${roleId}/permissions`, permissionIds),
};

// Permissions API
export const permissionsApi = {
  getAll: () => api.get('/permissions'),
  getByModule: (module: string) => api.get(`/permissions/module/${module}`),
  getById: (id: number) => api.get(`/permissions/${id}`),
  create: (data: any) => api.post('/permissions', data),
  delete: (id: number) => api.delete(`/permissions/${id}`),
};

// User Role Assignment API
export const userRoleApi = {
  assignRole: (userId: number, roleId: number) => 
    api.post('/auth/assign-role', { userId, roleId }),
};

// Users API
export const usersApi = {
  getAll: () => api.get('/auth/users'),
  update: (id: number, data: any) => api.put(`/auth/users/${id}`, data),
  resetPassword: (id: number, newPassword?: string) => api.post(`/auth/users/${id}/reset-password`, { newPassword }),
  setActive: (id: number, active: boolean) => api.patch(`/auth/users/${id}/active`, { active }),
};


// FGPO API
export const fgpoApi = {
  getAll: () => api.get('/fgpo'),
  getById: (id: number) => api.get(`/fgpo/${id}`),
  create: (data: any) => api.post('/fgpo', data),
  update: (id: number, data: any) => api.put(`/fgpo/${id}`, data),
  delete: (id: number) => api.delete(`/fgpo/${id}`),
  search: (term: string) => api.get('/fgpo/search', { params: { term } }),
  getPaged: (params: any) => api.get('/fgpo/paged', { params }),
};

// Customers API
export const customersApi = {
  getAll: () => api.get('/customers'),
  getById: (id: number) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: number, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
  search: (term: string) => api.get('/customers/search', { params: { term } }),
  getPaged: (params: any) => api.get('/customers/paged', { params }),
};

// Factories API
export const factoriesApi = {
  getAll: () => api.get('/factories'),
  getById: (id: number) => api.get(`/factories/${id}`),
  create: (data: any) => api.post('/factories', data),
  update: (id: number, data: any) => api.put(`/factories/${id}`, data),
  delete: (id: number) => api.delete(`/factories/${id}`),
  search: (term: string) => api.get('/factories/search', { params: { term } }),
  getPaged: (params: any) => api.get('/factories/paged', { params }),
};

// Suppliers API
export const suppliersApi = {
  getAll: () => api.get('/suppliers'),
  getById: (id: number) => api.get(`/suppliers/${id}`),
  create: (data: any) => api.post('/suppliers', data),
  update: (id: number, data: any) => api.put(`/suppliers/${id}`, data),
  delete: (id: number) => api.delete(`/suppliers/${id}`),
  search: (term: string) => api.get('/suppliers/search', { params: { term } }),
  getPaged: (params: any) => api.get('/suppliers/paged', { params }),
};

// Fabric Requirements API
export const fabricRequirementsApi = {
  getAll: () => api.get('/fabric-requirements'),
  getById: (id: number) => api.get(`/fabric-requirements/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/fabric-requirements/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/fabric-requirements', data),
  generate: (fgpoId: number, data: any) => api.post(`/fabric-requirements/generate/${fgpoId}`, data),
  update: (id: number, data: any) => api.put(`/fabric-requirements/${id}`, data),
  delete: (id: number) => api.delete(`/fabric-requirements/${id}`),
  getPaged: (params: any) => api.get('/fabric-requirements/paged', { params }),
};

// Fabric PO API
export const fabricPOsApi = {
  getAll: () => api.get('/fabric-pos'),
  getById: (id: number) => api.get(`/fabric-pos/${id}`),
  create: (data: any) => api.post('/fabric-pos', data),
  update: (id: number, data: any) => api.put(`/fabric-pos/${id}`, data),
  delete: (id: number) => api.delete(`/fabric-pos/${id}`),
  getPaged: (params: any) => api.get('/fabric-pos/paged', { params }),
  // Fabric Requirements disponibles para agregar como líneas.
  // excludeFabricPOId: al editar una PO, omite sus propias líneas del cálculo
  // de Remaining para que pueda reasignar sus cantidades.
  getAvailableRequirements: (params: any) =>
    api.get('/fabric-pos/available-requirements', { params }),
  // PDF oficial de la Fabric PO: lo construye el backend (MigraDoc).
  // El frontend sólo lo solicita y lo descarga: no recalcula importes.
  getPdf: (id: number) =>
    api.get(`/fabric-pos/${id}/pdf`, { responseType: 'blob' }),
};

// Mill Production API
export const millProductionsApi = {
  getAll: () => api.get('/mill-productions'),
  getById: (id: number) => api.get(`/mill-productions/${id}`),
  getByFabricPO: (fabricPOId: number) => api.get(`/mill-productions/fabric-po/${fabricPOId}`),
  getByFgpo: (fgpoId: number) => api.get(`/mill-productions/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/mill-productions', data),
  update: (id: number, data: any) => api.put(`/mill-productions/${id}`, data),
  delete: (id: number) => api.delete(`/mill-productions/${id}`),
  getPaged: (params: any) => api.get('/mill-productions/paged', { params }),
};

// Mill Test API
export const millTestsApi = {
  getAll: () => api.get('/mill-tests'),
  getById: (id: number) => api.get(`/mill-tests/${id}`),
  getByFabricPO: (fabricPOId: number) => api.get(`/mill-tests/fabric-po/${fabricPOId}`),
  getByFgpo: (fgpoId: number) => api.get(`/mill-tests/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/mill-tests', data),
  update: (id: number, data: any) => api.put(`/mill-tests/${id}`, data),
  delete: (id: number) => api.delete(`/mill-tests/${id}`),
  getPaged: (params: any) => api.get('/mill-tests/paged', { params }),
};

// Fabric Shipment API
export const fabricShipmentsApi = {
  getAll: () => api.get('/fabric-shipments'),
  getTotals: () => api.get('/fabric-shipments/totals'),
  getById: (id: number) => api.get(`/fabric-shipments/${id}`),
  getByFabricPO: (fabricPOId: number) => api.get(`/fabric-shipments/fabric-po/${fabricPOId}`),
  getByFgpo: (fgpoId: number) => api.get(`/fabric-shipments/fgpo/${fgpoId}`),
  getByLot: (lotNumber: string) => api.get(`/fabric-shipments/lot/${lotNumber}`),
  create: (data: any) => api.post('/fabric-shipments', data),
  update: (id: number, data: any) => api.put(`/fabric-shipments/${id}`, data),
  delete: (id: number) => api.delete(`/fabric-shipments/${id}`),
  getPaged: (params: any) => api.get('/fabric-shipments/paged', { params }),
};

// Fabric Shipment Lots API
export const fabricShipmentLotsApi = {
  getByShipment: (shipmentId: number) => api.get(`/fabric-shipments/${shipmentId}/lots`),
  getById: (id: number) => api.get(`/fabric-shipment-lots/${id}`),
  create: (data: any) => api.post('/fabric-shipment-lots', data),
  update: (id: number, data: any) => api.put(`/fabric-shipment-lots/${id}`, data),
  delete: (id: number) => api.delete(`/fabric-shipment-lots/${id}`),
  getRolls: (lotId: number) => api.get(`/fabric-shipment-lots/${lotId}/rolls`),
  associateRoll: (lotId: number, rollReceivingId: number) => api.post(`/fabric-shipment-lots/${lotId}/rolls`, { rollReceivingId }),
  unlinkRoll: (lotId: number, rollReceivingId: number) => api.delete(`/fabric-shipment-lots/${lotId}/rolls/${rollReceivingId}`),
};

// Fabric Receiving API
export const fabricReceivingsApi = {
  getAll: () => api.get('/fabric-receivings'),
  getTotals: () => api.get('/fabric-receivings/totals'),
  getById: (id: number) => api.get(`/fabric-receivings/${id}`),
  getByFabricPO: (fabricPOId: number) => api.get(`/fabric-receivings/fabric-po/${fabricPOId}`),
  getByFgpo: (fgpoId: number) => api.get(`/fabric-receivings/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/fabric-receivings', data),
  update: (id: number, data: any) => api.put(`/fabric-receivings/${id}`, data),
  delete: (id: number) => api.delete(`/fabric-receivings/${id}`),
  getPaged: (params: any) => api.get('/fabric-receivings/paged', { params }),
};

// Roll Receiving API
export const rollReceivingsApi = {
  getAll: () => api.get('/roll-receivings'),
  getById: (id: number) => api.get(`/roll-receivings/${id}`),
  getByReceiving: (receivingId: number) => api.get(`/roll-receivings/receiving/${receivingId}`),
  create: (data: any) => api.post('/roll-receivings', data),
  update: (id: number, data: any) => api.put(`/roll-receivings/${id}`, data),
  delete: (id: number) => api.delete(`/roll-receivings/${id}`),
  getPaged: (params: any) => api.get('/roll-receivings/paged', { params }),
};

// Fabric Inventory API
export const fabricInventoriesApi = {
  getAll: () => api.get('/fabric-inventories'),
  getTotals: () => api.get('/fabric-inventories/totals'),
  getById: (id: number) => api.get(`/fabric-inventories/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/fabric-inventories/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/fabric-inventories', data),
  update: (id: number, data: any) => api.put(`/fabric-inventories/${id}`, data),
  delete: (id: number) => api.delete(`/fabric-inventories/${id}`),
  getPaged: (params: any) => api.get('/fabric-inventories/paged', { params }),
};

// Fabric Reservation API
export const fabricReservationsApi = {
  getAll: () => api.get('/fabric-reservations'),
  getTotals: () => api.get('/fabric-reservations/totals'),
  getById: (id: number) => api.get(`/fabric-reservations/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/fabric-reservations/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/fabric-reservations', data),
  update: (id: number, data: any) => api.put(`/fabric-reservations/${id}`, data),
  release: (id: number, data: any) => api.post(`/fabric-reservations/${id}/release`, data),
  delete: (id: number) => api.delete(`/fabric-reservations/${id}`),
  getPaged: (params: any) => api.get('/fabric-reservations/paged', { params }),
};

// Fabric Movements API (historial de movimientos físicos + saldos por rollo)
export const fabricMovementsApi = {
  getAll: () => api.get('/fabric-movements'),
  getTotals: () => api.get('/fabric-movements/totals'),
  getById: (id: number) => api.get(`/fabric-movements/${id}`),
  getByRoll: (rollReceivingId: number) => api.get(`/fabric-movements/roll/${rollReceivingId}`),
  getBalances: () => api.get('/fabric-movements/balances'),
  create: (data: any) => api.post('/fabric-movements', data),
};

// Packing Control API
export const packingControlsApi = {
  getAll: () => api.get('/packing-controls'),
  getById: (id: number) => api.get(`/packing-controls/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/packing-controls/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/packing-controls', data),
  update: (id: number, data: any) => api.put(`/packing-controls/${id}`, data),
  delete: (id: number) => api.delete(`/packing-controls/${id}`),
  getPaged: (params: any) => api.get('/packing-controls/paged', { params }),
};

// Finished Goods API
export const finishedGoodsApi = {
  getAll: () => api.get('/finished-goods'),
  getById: (id: number) => api.get(`/finished-goods/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/finished-goods/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/finished-goods', data),
  update: (id: number, data: any) => api.put(`/finished-goods/${id}`, data),
  delete: (id: number) => api.delete(`/finished-goods/${id}`),
  getPaged: (params: any) => api.get('/finished-goods/paged', { params }),
};

// Shipment Control API
export const shipmentControlsApi = {
  getAll: () => api.get('/shipment-controls'),
  getById: (id: number) => api.get(`/shipment-controls/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/shipment-controls/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/shipment-controls', data),
  update: (id: number, data: any) => api.put(`/shipment-controls/${id}`, data),
  delete: (id: number) => api.delete(`/shipment-controls/${id}`),
  getPaged: (params: any) => api.get('/shipment-controls/paged', { params }),
};

// Lots API
export const lotsApi = {
  getAll: () => api.get('/lots'),
  getById: (id: number) => api.get(`/lots/${id}`),
};

// Four-Point Inspection API
export const fourPointApi = {
  getAll: () => api.get('/four-point'),
  getById: (id: number) => api.get(`/four-point/${id}`),
  getByFabricPO: (fabricPOId: number) => api.get(`/four-point/fabric-po/${fabricPOId}`),
  getByFgpo: (fgpoId: number) => api.get(`/four-point/fgpo/${fgpoId}`),
  getByReceiving: (receivingId: number) => api.get(`/four-point/receiving/${receivingId}`),
  create: (data: any) => api.post('/four-point', data),
  update: (id: number, data: any) => api.put(`/four-point/${id}`, data),
  delete: (id: number) => api.delete(`/four-point/${id}`),
  getPaged: (params: any) => api.get('/four-point/paged', { params }),
};

// Internal Test API
export const internalTestsApi = {
  getAll: () => api.get('/internal-tests'),
  getById: (id: number) => api.get(`/internal-tests/${id}`),
  getByFabricPO: (fabricPOId: number) => api.get(`/internal-tests/fabric-po/${fabricPOId}`),
  getByFgpo: (fgpoId: number) => api.get(`/internal-tests/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/internal-tests', data),
  update: (id: number, data: any) => api.put(`/internal-tests/${id}`, data),
  delete: (id: number) => api.delete(`/internal-tests/${id}`),
  getPaged: (params: any) => api.get('/internal-tests/paged', { params }),
};

// Shade Match API
export const shadeMatchesApi = {
  getAll: () => api.get('/shade-matches'),
  getById: (id: number) => api.get(`/shade-matches/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/shade-matches/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/shade-matches', data),
  update: (id: number, data: any) => api.put(`/shade-matches/${id}`, data),
  delete: (id: number) => api.delete(`/shade-matches/${id}`),
  getPaged: (params: any) => api.get('/shade-matches/paged', { params }),
};

// Inline Quality API
export const inlineQualitiesApi = {
  getAll: () => api.get('/inline-qualities'),
  getById: (id: number) => api.get(`/inline-qualities/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/inline-qualities/fgpo/${fgpoId}`),
  getByLine: (line: string) => api.get(`/inline-qualities/line/${line}`),
  create: (data: any) => api.post('/inline-qualities', data),
  update: (id: number, data: any) => api.put(`/inline-qualities/${id}`, data),
  delete: (id: number) => api.delete(`/inline-qualities/${id}`),
  getPaged: (params: any) => api.get('/inline-qualities/paged', { params }),
};

// Endline Inspection API
export const endlineInspectionsApi = {
  getAll: () => api.get('/endline-inspections'),
  getById: (id: number) => api.get(`/endline-inspections/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/endline-inspections/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/endline-inspections', data),
  update: (id: number, data: any) => api.put(`/endline-inspections/${id}`, data),
  delete: (id: number) => api.delete(`/endline-inspections/${id}`),
  getPaged: (params: any) => api.get('/endline-inspections/paged', { params }),
};


// Pre-Final Inspection API
export const preFinalInspectionsApi = {
  getAll: () => api.get('/pre-final-inspections'),
  getById: (id: number) => api.get(`/pre-final-inspections/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/pre-final-inspections/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/pre-final-inspections', data),
  update: (id: number, data: any) => api.put(`/pre-final-inspections/${id}`, data),
  delete: (id: number) => api.delete(`/pre-final-inspections/${id}`),
  getPaged: (params: any) => api.get('/pre-final-inspections/paged', { params }),
};

// Final Inspection API
export const finalInspectionsApi = {
  getAll: () => api.get('/final-inspections'),
  getById: (id: number) => api.get(`/final-inspections/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/final-inspections/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/final-inspections', data),
  update: (id: number, data: any) => api.put(`/final-inspections/${id}`, data),
  delete: (id: number) => api.delete(`/final-inspections/${id}`),
  getPaged: (params: any) => api.get('/final-inspections/paged', { params }),
};

// PP Sample API
export const ppSamplesApi = {
  getAll: () => api.get('/pp-samples'),
  getById: (id: number) => api.get(`/pp-samples/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/pp-samples/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/pp-samples', data),
  update: (id: number, data: any) => api.put(`/pp-samples/${id}`, data),
  delete: (id: number) => api.delete(`/pp-samples/${id}`),
  getPaged: (params: any) => api.get('/pp-samples/paged', { params }),
};

// TOP Sample API
export const topSamplesApi = {
  getAll: () => api.get('/top-samples'),
  getById: (id: number) => api.get(`/top-samples/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/top-samples/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/top-samples', data),
  update: (id: number, data: any) => api.put(`/top-samples/${id}`, data),
  delete: (id: number) => api.delete(`/top-samples/${id}`),
  getPaged: (params: any) => api.get('/top-samples/paged', { params }),
};

// Production Readiness API
export const productionReadinessApi = {
  getAll: () => api.get('/production-readiness'),
  getById: (id: number) => api.get(`/production-readiness/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/production-readiness/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/production-readiness', data),
  update: (id: number, data: any) => api.put(`/production-readiness/${id}`, data),
  delete: (id: number) => api.delete(`/production-readiness/${id}`),
  getPaged: (params: any) => api.get('/production-readiness/paged', { params }),
};

// Cutting Release API
export const cuttingReleasesApi = {
  getAll: () => api.get('/cutting-releases'),
  getById: (id: number) => api.get(`/cutting-releases/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/cutting-releases/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/cutting-releases', data),
  update: (id: number, data: any) => api.put(`/cutting-releases/${id}`, data),
  delete: (id: number) => api.delete(`/cutting-releases/${id}`),
  getPaged: (params: any) => api.get('/cutting-releases/paged', { params }),
};

// Cutting Control API
export const cuttingControlsApi = {
  getAll: () => api.get('/cutting-controls'),
  getById: (id: number) => api.get(`/cutting-controls/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/cutting-controls/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/cutting-controls', data),
  update: (id: number, data: any) => api.put(`/cutting-controls/${id}`, data),
  delete: (id: number) => api.delete(`/cutting-controls/${id}`),
  getPaged: (params: any) => api.get('/cutting-controls/paged', { params }),
};

// Cutting Panel QC API
export const cuttingPanelQcsApi = {
  getAll: () => api.get('/cutting-panel-qcs'),
  getById: (id: number) => api.get(`/cutting-panel-qcs/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/cutting-panel-qcs/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/cutting-panel-qcs', data),
  update: (id: number, data: any) => api.put(`/cutting-panel-qcs/${id}`, data),
  delete: (id: number) => api.delete(`/cutting-panel-qcs/${id}`),
  getPaged: (params: any) => api.get('/cutting-panel-qcs/paged', { params }),
};

// Style API
export const stylesApi = {
  getAll: () => api.get('/styles'),
  getById: (id: number) => api.get(`/styles/${id}`),
  search: (term?: string) => api.get('/styles/search', { params: { term } }),
  create: (data: any) => api.post('/styles', data),
  update: (id: number, data: any) => api.put(`/styles/${id}`, data),
  delete: (id: number) => api.delete(`/styles/${id}`),
  getPaged: (params: any) => api.get('/styles/paged', { params }),
};

// Fabric API
export const fabricsApi = {
  getAll: () => api.get('/fabrics'),
  getById: (id: number) => api.get(`/fabrics/${id}`),
  search: (term?: string) => api.get('/fabrics/search', { params: { term } }),
  create: (data: any) => api.post('/fabrics', data),
  update: (id: number, data: any) => api.put(`/fabrics/${id}`, data),
  delete: (id: number) => api.delete(`/fabrics/${id}`),
  getPaged: (params: any) => api.get('/fabrics/paged', { params }),
};

// Color API
export const colorsApi = {
  getAll: () => api.get('/colors'),
  getById: (id: number) => api.get(`/colors/${id}`),
  search: (term?: string) => api.get('/colors/search', { params: { term } }),
  create: (data: any) => api.post('/colors', data),
  update: (id: number, data: any) => api.put(`/colors/${id}`, data),
  delete: (id: number) => api.delete(`/colors/${id}`),
  getPaged: (params: any) => api.get('/colors/paged', { params }),
};

// Size API
export const sizesApi = {
  getAll: () => api.get('/sizes'),
  getById: (id: number) => api.get(`/sizes/${id}`),
  search: (term?: string) => api.get('/sizes/search', { params: { term } }),
  create: (data: any) => api.post('/sizes', data),
  update: (id: number, data: any) => api.put(`/sizes/${id}`, data),
  delete: (id: number) => api.delete(`/sizes/${id}`),
  getPaged: (params: any) => api.get('/sizes/paged', { params }),
};

// Component API
export const componentsApi = {
  getAll: () => api.get('/components'),
  getById: (id: number) => api.get(`/components/${id}`),
  search: (term?: string) => api.get('/components/search', { params: { term } }),
  create: (data: any) => api.post('/components', data),
  update: (id: number, data: any) => api.put(`/components/${id}`, data),
  delete: (id: number) => api.delete(`/components/${id}`),
  getPaged: (params: any) => api.get('/components/paged', { params }),
};

// BoxType API
export const boxTypesApi = {
  getAll: () => api.get('/box-types'),
  getById: (id: number) => api.get(`/box-types/${id}`),
  search: (term?: string) => api.get('/box-types/search', { params: { term } }),
  create: (data: any) => api.post('/box-types', data),
  update: (id: number, data: any) => api.put(`/box-types/${id}`, data),
  delete: (id: number) => api.delete(`/box-types/${id}`),
  getPaged: (params: any) => api.get('/box-types/paged', { params }),
};

// StyleYield API
export const styleYieldsApi = {
  getAll: () => api.get('/style-yields'),
  getById: (id: number) => api.get(`/style-yields/${id}`),
  getByStyle: (styleId: number) => api.get(`/style-yields/style/${styleId}`),
  create: (data: any) => api.post('/style-yields', data),
  update: (id: number, data: any) => api.put(`/style-yields/${id}`, data),
  delete: (id: number) => api.delete(`/style-yields/${id}`),
  getPaged: (params: any) => api.get('/style-yields/paged', { params }),
};

// Price API
export const pricesApi = {
  getAll: () => api.get('/prices'),
  getById: (id: number) => api.get(`/prices/${id}`),
  getByStyle: (styleId: number) => api.get(`/prices/style/${styleId}`),
  create: (data: any) => api.post('/prices', data),
  update: (id: number, data: any) => api.put(`/prices/${id}`, data),
  delete: (id: number) => api.delete(`/prices/${id}`),
  getPaged: (params: any) => api.get('/prices/paged', { params }),
};

// FgpoLine API
export const fgpoLinesApi = {
  getAll: () => api.get('/fgpo-lines'),
  getById: (id: number) => api.get(`/fgpo-lines/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/fgpo-lines/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/fgpo-lines', data),
  update: (id: number, data: any) => api.put(`/fgpo-lines/${id}`, data),
  delete: (id: number) => api.delete(`/fgpo-lines/${id}`),
  getPaged: (params: any) => api.get('/fgpo-lines/paged', { params }),
};

// Trims Control API
export const trimsControlsApi = {
  getAll: () => api.get('/trims-controls'),
  getById: (id: number) => api.get(`/trims-controls/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/trims-controls/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/trims-controls', data),
  update: (id: number, data: any) => api.put(`/trims-controls/${id}`, data),
  delete: (id: number) => api.delete(`/trims-controls/${id}`),
  getPaged: (params: any) => api.get('/trims-controls/paged', { params }),
};

// Sewing Production API
export const sewingProductionsApi = {
  getAll: () => api.get('/sewing-productions'),
  getById: (id: number) => api.get(`/sewing-productions/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/sewing-productions/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/sewing-productions', data),
  update: (id: number, data: any) => api.put(`/sewing-productions/${id}`, data),
  delete: (id: number) => api.delete(`/sewing-productions/${id}`),
  getPaged: (params: any) => api.get('/sewing-productions/paged', { params }),
};

// AQL Inspections API (Endline / Pre-Final / Final unificados)
export const aqlInspectionsApi = {
  getAll: (params?: any) => api.get('/aql-inspections', { params }),
  getById: (id: number) => api.get(`/aql-inspections/${id}`),
  getByFgpo: (fgpoId: number) => api.get(`/aql-inspections/fgpo/${fgpoId}`),
  create: (data: any) => api.post('/aql-inspections', data),
  update: (id: number, data: any) => api.put(`/aql-inspections/${id}`, data),
  delete: (id: number) => api.delete(`/aql-inspections/${id}`),
  getPaged: (params: any) => api.get('/aql-inspections', { params }),
};

// Auth API
export const authApi = {
  login: (userName: string, password: string) => 
    api.post('/auth/login', { userName, password }),
  register: (userName: string, userEmail: string, password: string) => 
    api.post('/auth/register', { userName, userEmail, password }),
  getPublicKey: () => api.get('/auth/public-key'),
  getLoginCustomers: () => api.get('/auth/login-customers'),
  getLoginProfile: (userName: string) => api.get('/auth/login-profile', { params: { userName } }),
  createUser: (userName: string, userEmail: string, userType: string, customerId?: number) =>
    api.post('/auth/users', { userName, userEmail, userType, customerId, password: 'inicio' }),
  changePassword: (currentPassword: string, newPassword: string) => 
    api.post('/auth/change-password', { currentPassword, newPassword }),
  changePasswordFirstLogin: (newPassword: string) => 
    api.post('/auth/change-password', { currentPassword: '', newPassword }),

};

// Catalogs API (UOM, FabricComponent, Statuses, etc.)
export const catalogsApi = {
  getAll: () => api.get('/catalogs'),
  getByType: (type: string) => api.get(`/catalogs/${type}`),
};



export default api;
