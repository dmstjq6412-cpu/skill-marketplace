import express from 'express';
import https from 'https';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { issueJwt, authenticate } from '../middleware/auth.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 20, // 15분 내 최대 20회 요청
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// 일회용 코드 저장소 (5분 TTL)
const onetimeCodes = new Map();
const CODE_TTL_MS = 5 * 60 * 1000;

function storeOnetimeCode(jwt) {
  const code = crypto.randomBytes(32).toString('hex');
  onetimeCodes.set(code, { jwt, expiresAt: Date.now() + CODE_TTL_MS });
  return code;
}

function consumeOnetimeCode(code) {
  const entry = onetimeCodes.get(code);
  if (!entry) return null;
  onetimeCodes.delete(code);
  if (Date.now() > entry.expiresAt) return null;
  return entry.jwt;
}

function githubApiGet(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'skill-marketplace',
        Accept: 'application/json',
      },
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`GitHub API error: ${res.statusCode}`));
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Invalid JSON response from GitHub'));
        }
      });
    }).on('error', reject);
  });
}

function exchangeCodeForToken(code) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    });
    const options = {
      hostname: 'github.com',
      path: '/login/oauth/access_token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error_description || parsed.error));
          resolve(parsed.access_token);
        } catch {
          reject(new Error('Invalid JSON response from GitHub'));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// GET /api/auth/github/callback — 브라우저 OAuth 흐름
// JWT를 URL에 직접 노출하지 않고 일회용 코드로 교환
router.get('/github/callback', authLimiter, async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Missing code' });
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(500).json({ error: 'GitHub OAuth not configured' });
  }

  try {
    const accessToken = await exchangeCodeForToken(code);
    const user = await githubApiGet('/user', accessToken);
    // access token 파기 — JWT에는 github_id + username만 포함
    const jwtToken = issueJwt({ github_id: user.id, username: user.login });
    // JWT를 URL에 직접 노출하지 않고 일회용 코드로 교환
    const onetimeCode = storeOnetimeCode(jwtToken);
    res.redirect(`${FRONTEND_URL}/auth/callback?code=${onetimeCode}`);
  } catch {
    res.status(401).json({ error: 'GitHub authentication failed' });
  }
});

// GET /api/auth/token?code=xxx — 일회용 코드를 JWT로 교환
router.get('/token', authLimiter, (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Missing code' });
  const jwt = consumeOnetimeCode(code);
  if (!jwt) return res.status(401).json({ error: 'Invalid or expired code' });
  res.json({ token: jwt });
});

// POST /api/auth/cli — CLI (gh auth token) 흐름
router.post('/cli', authLimiter, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  try {
    const user = await githubApiGet('/user', token);
    // token 파기 — JWT만 반환
    const jwtToken = issueJwt({ github_id: user.id, username: user.login });
    res.json({ token: jwtToken, username: user.login });
  } catch {
    res.status(401).json({ error: 'GitHub token verification failed' });
  }
});

// GET /api/auth/me — 현재 사용자 정보 (프론트엔드용)
router.get('/me', authenticate, (req, res) => {
  res.json({ github_id: req.user.github_id, username: req.user.username });
});

export default router;
