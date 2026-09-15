import apiClient from './client';

export const fetchWeatherTrend = async (params = {}) => {
  return apiClient.get('/weather/trend', { params });
};

export const fetchWeatherRainfall = async (params = {}) => {
  return apiClient.get('/weather/rainfall', { params });
};

export const fetchWeatherEvents = async (params = {}) => {
  return apiClient.get('/weather/events', { params });
};

export const fetchWeatherExtremes = async (params = {}) => {
  return apiClient.get('/weather/extremes', { params });
};

export const fetchWeatherSensors = async () => {
  return apiClient.get('/weather/sensors');
};

export const fetchWeatherCalendar = async (params = {}) => {
  return apiClient.get('/weather/calendar', { params });
};

