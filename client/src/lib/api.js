import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL
});

export const authHeader = (token) => token ? { Authorization: `Bearer ${token}` } : {};

export default api;
