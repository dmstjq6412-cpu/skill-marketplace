import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const fetchSkills = (search = '', page = 1) =>
  api.get('/skills', { params: { search, page, limit: 20 } }).then(r => r.data);

export const fetchSkill = (id) =>
  api.get(`/skills/${id}`).then(r => r.data);

export const uploadSkill = (formData) =>
  api.post('/skills', formData).then(r => r.data);

export const deleteSkill = (id) =>
  api.delete(`/skills/${id}`).then(r => r.data);

export const getDownloadUrl = (id) => `${BASE}/skills/${id}/download`;

export const fetchSkillFile = (skillId, fileId) =>
  api.get(`/skills/${skillId}/files/${fileId}`).then(r => r.data);

export const fetchHarnessLogs = () =>
  api.get('/harness/logs').then(r => r.data);

export const fetchHarnessLog = (date) =>
  api.get(`/harness/logs/${date}`).then(r => r.data);

export const fetchHarnessBlueprints = () =>
  api.get('/harness/blueprints').then(r => r.data);

export const fetchHarnessBlueprintBySkill = (skill) =>
  api.get(`/harness/blueprints/${skill}`).then(r => r.data);

export const fetchHarnessAnalyses = () =>
  api.get('/harness/analysis').then(r => r.data);

export const fetchHarnessAnalysis = (id) =>
  api.get(`/harness/analysis/${id}`).then(r => r.data);

export const fetchHarnessReferences = (tag) =>
  api.get('/harness/references', { params: tag ? { tag } : {} }).then(r => r.data);

export const deleteHarnessReference = (id) =>
  api.delete(`/harness/references/${id}`).then(r => r.data);

export const fetchHarnessEvaluations = (skill) =>
  api.get(`/harness/evaluations/${skill}`).then(r => r.data);

export const fetchAllHarnessEvaluations = (skill) =>
  api.get('/harness/evaluations', { params: skill ? { skill } : {} }).then(r => r.data);

export const patchHarnessEvaluation = (id, gap_decisions) =>
  api.patch(`/harness/evaluations/${id}`, { gap_decisions }).then(r => r.data);

export const fetchMe = () =>
  api.get('/auth/me').then(r => r.data);

export const exchangeAuthCode = (code) =>
  api.get('/auth/token', { params: { code } }).then(r => r.data);

export const loginWithCliToken = (token) =>
  api.post('/auth/cli', { token }).then(r => r.data);

export const getGithubLoginUrl = () => {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const redirectUri = `${apiBase}/api/auth/github/callback`;
  return `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=read%3Auser&redirect_uri=${encodeURIComponent(redirectUri)}`;
};
