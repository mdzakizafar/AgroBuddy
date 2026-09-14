import apiClient from './client';

export const fetchLogisticsSummary = async (params = {}) => {
  return apiClient.get('/logistics/summary', { params });
};

export const fetchLogisticsDelays = async (params = {}) => {
  return apiClient.get('/logistics/delays', { params });
};

export const fetchLogisticsByMandi = async (params = {}) => {
  return apiClient.get('/logistics/by-mandi', { params });
};
