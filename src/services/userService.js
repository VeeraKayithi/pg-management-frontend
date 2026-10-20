import apiClient from "./apiClient.js";

const USER_URL = "/users";

export const createTenantAccount = async (accountData) => {
  const response = await apiClient.post(
    `${USER_URL}/tenant-account`,
    accountData
  );

  return response.data;
};

export const getStaffAccounts = async () => {
  const response = await apiClient.get(
    `${USER_URL}/staff-accounts`
  );

  return response.data;
};

export const createStaffAccount = async (accountData) => {
  const response = await apiClient.post(
    `${USER_URL}/staff-account`,
    accountData
  );

  return response.data;
};

export const updateStaffAccountStatus = async (
  userId,
  active
) => {
  const response = await apiClient.patch(
    `${USER_URL}/staff-accounts/${userId}/active`,
    { active }
  );

  return response.data;
};