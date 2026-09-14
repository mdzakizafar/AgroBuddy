import apiClient from './client';

export const fetchFilters = async () => {
  return apiClient.get('/filters');
};
