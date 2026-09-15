import apiClient from './client';

export const fetchRiskMandis = async (params = {}) => {
  return apiClient.get('/risk/mandis', { params });
};

export const fetchRiskMap = async (params = {}) => {
  return apiClient.get('/risk/map', { params });
};

export const fetchRiskDistribution = async (params = {}) => {
  return apiClient.get('/risk/distribution', { params });
};

export const fetchRiskDrivers = async (params = {}) => {
  return apiClient.get('/risk/drivers', { params });
};

export const fetchEmergingRisks = async (params = {}) => {
  return apiClient.get('/risk/emerging', { params });
};

export const fetchRiskMandiDetail = async (mandiId) => {
  return apiClient.get(`/risk/mandis/${mandiId}`);
};
