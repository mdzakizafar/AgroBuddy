import apiClient from './client';

export const postAgentQuery = async (queryText) => {
  return apiClient.post('/agent/query', { query: queryText });
};
