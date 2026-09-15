import apiClient from './client';

export const fetchPricesKPIs = async (params = {}) => {
  return apiClient.get('/prices/kpis', { params });
};

export const fetchPricesMSPTrend = async (params = {}) => {
  return apiClient.get('/prices/msp-trend', { params });
};

export const fetchPricesByCrop = async (params = {}) => {
  return apiClient.get('/prices/by-crop', { params });
};

export const fetchPricesByMandi = async (params = {}) => {
  return apiClient.get('/prices/by-mandi', { params });
};

export const fetchPriceDirectory = async (params = {}) => {
  return apiClient.get('/prices/directory', { params });
};

export const fetchPricesMSP = async (params = {}) => {
  return apiClient.get('/prices/msp', { params });
};

export const fetchPricePressure = async (params = {}) => {
  return apiClient.get('/prices/pressure', { params });
};
