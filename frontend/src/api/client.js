import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({ baseURL: BASE });

export const fetchSkills = (search = '', page = 1) =>
  api.get('/skills', { params: { search, page, limit: 20 } }).then(r => r.data);

export const fetchSkill = (id) =>
  api.get(`/skills/${id}`).then(r => r.data);

export const uploadSkill = (formData) =>
  api.post('/skills', formData).then(r => r.data);

export const deleteSkill = (id) =>
  api.delete(`/skills/${id}`).then(r => r.data);

export const getDownloadUrl = (id) => `${BASE}/skills/${id}/download`;
