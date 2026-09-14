import apiClient from './client';

export const fetchRiskMandis = async (params = {}) => {
  return apiClient.get('/risk/mandis', { params });
};

export const fetchRiskMandiDetail = async (mandiId) => {
  return apiClient.get(`/risk/mandis/${mandiId}`);
};
