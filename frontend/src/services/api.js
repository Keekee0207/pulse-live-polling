import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8085/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization header automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pulse_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get or generate unique client voter ID for anti-duplicate voting
export const getVoterId = () => {
  let voterId = localStorage.getItem('pulse_voter_id');
  if (!voterId) {
    voterId = 'voter_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('pulse_voter_id', voterId);
  }
  return voterId;
};

export default api;
