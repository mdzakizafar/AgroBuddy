import apiClient from './client';

export const fetchArrivalTrend = async (params = {}) => {
  return apiClient.get('/arrivals/trend', { params });
};

export const fetchArrivalsByCrop = async (params = {}) => {
  return apiClient.get('/arrivals/by-crop', { params });
};

export const fetchArrivalMix = async (params = {}) => {
  return apiClient.get('/arrivals/mix', { params });
};

export const fetchArrivalVolatility = async (params = {}) => {
  return apiClient.get('/arrivals/volatility', { params });
};

export const fetchArrivalsByMandi = async (params = {}) => {
  return apiClient.get('/arrivals/by-mandi', { params });
};
