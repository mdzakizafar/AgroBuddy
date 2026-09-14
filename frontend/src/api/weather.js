import apiClient from './client';

export const fetchWeatherTrend = async (params = {}) => {
  return apiClient.get('/weather/trend', { params });
};

export const fetchWeatherExtremes = async (params = {}) => {
  return apiClient.get('/weather/extremes', { params });
};

export const fetchWeatherSensors = async () => {
  return apiClient.get('/weather/sensors');
};
