import apiClient from './client';

export const fetchForecastArrivals = async (params = {}) => {
  return apiClient.get('/forecast/arrivals', { params });
};
