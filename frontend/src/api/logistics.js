import apiClient from './client';

export const fetchLogisticsSummary = async (params = {}) => {
  return apiClient.get('/logistics/summary', { params });
};

export const fetchTransitTrend = async (params = {}) => {
  return apiClient.get('/logistics/transit-trend', { params });
};

export const fetchMandiLogisticsPerformance = async (params = {}) => {
  return apiClient.get('/logistics/mandi-performance', { params });
};

export const fetchRouteLogistics = async (params = {}) => {
  return apiClient.get('/logistics/routes', { params });
};

export const fetchLogisticsDelays = async (params = {}) => {
  return apiClient.get('/logistics/delays', { params });
};

export const fetchLogisticsByMandi = async (params = {}) => {
  return apiClient.get('/logistics/by-mandi', { params });
};
