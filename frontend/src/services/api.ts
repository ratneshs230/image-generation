import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error: string }>) => {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error || 'An error occurred';

      if (status === 401) {
        localStorage.removeItem('token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else if (status === 429) {
        toast.error('Too many requests. Please wait a moment.');
      } else if (status >= 500) {
        toast.error('Server error. Please try again later.');
      }

      return Promise.reject(new Error(message));
    }

    if (error.request) {
      toast.error('Network error. Please check your connection.');
    }

    return Promise.reject(error);
  }
);

// Room API
export const roomApi = {
  create: (name: string, maxPlayers?: number, maxTurns?: number) =>
    api.post('/rooms', { name, maxPlayers, maxTurns }),

  getByCode: (code: string) =>
    api.get(`/rooms/code/${code}`),

  getById: (roomId: string) =>
    api.get(`/rooms/${roomId}`),

  join: (roomId: string) =>
    api.post(`/rooms/${roomId}/join`),

  leave: (roomId: string) =>
    api.post(`/rooms/${roomId}/leave`),

  update: (roomId: string, data: { name?: string; maxPlayers?: number; maxTurns?: number }) =>
    api.patch(`/rooms/${roomId}`, data),

  getMyRooms: () =>
    api.get('/rooms/user/my-rooms'),
};

// Game API
export const gameApi = {
  start: (roomId: string, data: FormData) =>
    api.post(`/game/${roomId}/start`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  submitTurn: (roomId: string, prompt: string) =>
    api.post(`/game/${roomId}/turn`, { prompt }),

  endGame: (roomId: string) =>
    api.post(`/game/${roomId}/end`),

  getState: (roomId: string) =>
    api.get(`/game/${roomId}/state`),

  getHistory: (roomId: string) =>
    api.get(`/game/${roomId}/history`),

  skipTurn: (roomId: string) =>
    api.post(`/game/${roomId}/skip`),
};

// User API
export const userApi = {
  getProfile: () =>
    api.get('/users/profile'),

  updateProfile: (data: { displayName?: string }) =>
    api.patch('/users/profile', data),

  getStats: () =>
    api.get('/users/stats'),

  getGames: (params?: { status?: string; limit?: number; offset?: number }) =>
    api.get('/users/games', { params }),

  getLeaderboard: (sortBy?: string, limit?: number) =>
    api.get('/users/stats/leaderboard', { params: { sortBy, limit } }),

  getPublicProfile: (username: string) =>
    api.get(`/users/${username}`),
};
