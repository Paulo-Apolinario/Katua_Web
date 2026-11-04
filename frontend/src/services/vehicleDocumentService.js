import { apiRequest } from './apiClient';
const path = id => `/vehicle-documents/${encodeURIComponent(id)}`;
export const getVehicleDocuments = () => apiRequest('/vehicle-documents');
export const getVehicleDocumentById = id => apiRequest(path(id));
export const createVehicleDocument = payload => apiRequest('/vehicle-documents', { method: 'POST', body: payload });
export const updateVehicleDocument = (id, payload) => apiRequest(path(id), { method: 'PUT', body: payload });
export const deleteVehicleDocument = id => apiRequest(path(id), { method: 'DELETE' });
