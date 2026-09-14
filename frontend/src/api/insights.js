import apiClient from './client';

export const postInsight = async (payload) => {
  return apiClient.post('/insights', payload);
};
