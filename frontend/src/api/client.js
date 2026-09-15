import axios from 'axios';

const apiBase = import.meta.env.VITE_API_BASE_URL || '';
const baseURL = apiBase ? `${apiBase.replace(/\/$/, '')}/api/v1` : '/api/v1';

const apiClient = axios.create({
  baseURL,
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
