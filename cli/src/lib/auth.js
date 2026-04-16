import { execSync } from 'child_process';
import https from 'https';
import fs from 'fs';
import os from 'os';
import path from 'path';

const TOKEN_CACHE_PATH = path.join(os.homedir(), '.skill-marketplace-token');
const getApiBase = () =>
  process.env.SKILL_MARKETPLACE_API || 'https://skill-marketplace-umzq.onrender.com/api';

function isTokenValid(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.exp * 1000 > Date.now() + 60_000; // 1분 여유
  } catch {
    return false;
  }
}

function loadCachedToken() {
  try {
    const token = fs.readFileSync(TOKEN_CACHE_PATH, 'utf8').trim();
    return isTokenValid(token) ? token : null;
  } catch {
    return null;
  }
}

function saveToken(token) {
  try {
    fs.writeFileSync(TOKEN_CACHE_PATH, token, { mode: 0o600 });
  } catch {
    // 캐시 저장 실패는 무시 — 다음 실행 때 재발급
  }
}

function getGhToken() {
  try {
    return execSync('gh auth token', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    throw new Error(
      'GitHub CLI 인증이 필요합니다.\n' +
      '  gh auth login  을 먼저 실행해주세요.'
    );
  }
}

function postCliAuth(ghToken) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ token: ghToken });
    const url = new URL('/api/auth/cli', getApiBase().replace('/api', ''));
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`마켓플레이스 로그인 실패 (${res.statusCode}): ${data}`));
        }
        try {
          resolve(JSON.parse(data).token);
        } catch {
          reject(new Error('마켓플레이스 응답 파싱 실패'));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export async function getAuthToken() {
  const cached = loadCachedToken();
  if (cached) return cached;

  const ghToken = getGhToken();
  const jwtToken = await postCliAuth(ghToken);
  saveToken(jwtToken);
  return jwtToken;
}
