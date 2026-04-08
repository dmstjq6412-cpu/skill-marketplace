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

export const fetchSkillFile = (skillId, fileId) =>
  api.get(`/skills/${skillId}/files/${fileId}`).then(r => r.data);

export const fetchHarnessLogs = () =>
  api.get('/harness/logs').then(r => r.data);

export const fetchHarnessLog = (date) =>
  api.get(`/harness/logs/${date}`).then(r => r.data);

export const fetchHarnessBlueprints = () =>
  api.get('/harness/blueprints').then(r => r.data);

export const fetchHarnessBlueprint = (date) =>
  api.get(`/harness/blueprints/${date}`).then(r => r.data);

export const fetchHarnessBlueprintDiff = (from, to) =>
  api.get('/harness/blueprints/diff', { params: { from, to } }).then(r => r.data);
