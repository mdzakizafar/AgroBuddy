import apiClient from './client';

export const fetchMandis = async (params = {}) => {
  return apiClient.get('/mandis', { params });
};

export const fetchMandiDetail = async (mandiId) => {
  return apiClient.get(`/mandis/${mandiId}`);
};

export const fetchMandiMarketState = async (mandiId) => {
  return apiClient.get(`/mandis/${mandiId}/market-state`);
};
