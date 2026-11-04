import { apiRequest } from './apiClient';
const path = id => `/maintenance-logs/${encodeURIComponent(id)}`;
export const getAllMaintenanceLogs = () => apiRequest('/maintenance-logs');
export const getMaintenanceLogById = id => apiRequest(path(id));
export const createMaintenanceLog = payload => apiRequest('/maintenance-logs', { method: 'POST', body: payload });
export const updateMaintenanceLog = (id, payload) => apiRequest(path(id), { method: 'PUT', body: payload });
export const deleteMaintenanceLog = id => apiRequest(path(id), { method: 'DELETE' });
