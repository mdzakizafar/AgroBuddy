import apiClient from './client';

export const fetchPricesMSP = async (params = {}) => {
  return apiClient.get('/prices/msp', { params });
};

export const fetchPricePressure = async (params = {}) => {
  return apiClient.get('/prices/pressure', { params });
};
