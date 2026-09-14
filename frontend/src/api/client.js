import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Request error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
