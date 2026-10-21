import apiClient from "./apiClient.js";
const TENANT_URL = "/tenants";
export const getAllTenants = async () => (await apiClient.get(TENANT_URL)).data;
export const getTenantById = async id => (await apiClient.get(`${TENANT_URL}/${id}`)).data;
export const getMyTenantProfile = async () => (await apiClient.get(`${TENANT_URL}/me`)).data;
export const createTenant = async data => (await apiClient.post(TENANT_URL,data)).data;
export const updateTenant = async (id,data) => (await apiClient.put(`${TENANT_URL}/${id}`,data)).data;
export const markTenantAsLeft = async id => (await apiClient.put(`${TENANT_URL}/${id}/leave`)).data;

export const getTenantStayHistory = async (tenantId) => {
  const response = await apiClient.get(`${TENANT_URL}/${tenantId}/stays`);
  return response.data;
};
