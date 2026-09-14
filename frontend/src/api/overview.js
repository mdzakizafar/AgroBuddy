import apiClient from './client';

export const fetchOverview = async (params = {}) => {
  return apiClient.get('/overview', { params });
};
