#!/usr/bin/env node
/**
 * git-platform.js
 * Git 플랫폼(Gitea / GitHub / GitLab) PR 생성 CLI
 *
 * 환경변수에서 인증 정보를 읽으므로 토큰을 설정 파일에 저장하지 않아도 됩니다.
 *
 * 필요한 환경변수:
 *   Gitea:  GITEA_HOST, GITEA_TOKEN
 *   GitLab: GITLAB_HOST, GITLAB_TOKEN
 *   GitHub: gh CLI 인증 (환경변수 불필요)
 *
 * 사용법:
 *   node git-platform.js pr create \
 *     --base develop \
 *     --head feature/42-login \
 *     --title "feature/42-login: 로그인 구현" \
 *     --body "변경 요약" \
 *     --reviewer username \
 *     --platform gitea
 */

import { execFileSync } from 'child_process';
import https from 'https';
import http from 'http';

// ── 인수 파싱 ──────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}

const command  = args[0]; // pr
const subCmd   = args[1]; // create
const platform = getArg('--platform') || process.env.GIT_PLATFORM || 'gitea';
const base     = getArg('--base');
const head     = getArg('--head');
const title    = getArg('--title');
const body     = getArg('--body') || '';
const reviewer = getArg('--reviewer') || '';

if (command !== 'pr' || subCmd !== 'create') {
  console.error('사용법: node git-platform.js pr create --base <브랜치> --head <브랜치> --title <제목> [--body <내용>] [--reviewer <username>] [--platform gitea|github|gitlab]');
  process.exit(1);
}

if (!base || !head || !title) {
  console.error('[오류] --base, --head, --title 은 필수입니다.');
  process.exit(1);
}

// ── remote URL에서 owner/repo 추출 ─────────────────────────
function getOwnerRepo() {
  try {
    const remoteUrl = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
    // http(s)://host/owner/repo.git  또는  git@host:owner/repo.git
    const match = remoteUrl.match(/[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (!match) throw new Error('remote URL 파싱 실패: ' + remoteUrl);
    return { owner: match[1], repo: match[2] };
  } catch (e) {
    console.error('[오류] git remote 정보를 가져올 수 없습니다:', e.message);
    process.exit(1);
  }
}

// ── HTTP 요청 헬퍼 ─────────────────────────────────────────
function request(urlStr, options, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        } else {
          try { resolve(JSON.parse(body)); }
          catch { resolve(body); }
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── 플랫폼별 PR 생성 ───────────────────────────────────────
async function createPR() {
  const { owner, repo } = getOwnerRepo();

  if (platform === 'gitea') {
    const host  = process.env.GITEA_HOST;
    const token = process.env.GITEA_TOKEN;

    if (!host || !token) {
      console.error('[오류] Gitea 환경변수가 설정되지 않았습니다.');
      console.error('  export GITEA_HOST=http://your-gitea-server');
      console.error('  export GITEA_TOKEN=your_personal_access_token');
      process.exit(1);
    }

    const payload = JSON.stringify({
      title,
      body,
      head,
      base,
      assignees: reviewer ? [reviewer] : [],
    });

    const url = `${host}/api/v1/repos/${owner}/${repo}/pulls`;
    const result = await request(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);

    console.log(`✅ PR 생성 완료`);
    console.log(`PR URL: ${result.html_url}`);
    return result.html_url;

  } else if (platform === 'github') {
    try {
      const result = execFileSync('gh', [
        'pr', 'create',
        '--base', base,
        '--head', head,
        '--title', title,
        '--body', body,
        ...(reviewer ? ['--reviewer', reviewer] : []),
      ], { encoding: 'utf8' });
      const url = result.trim().split('\n').pop();
      console.log(`✅ PR 생성 완료`);
      console.log(`PR URL: ${url}`);
      return url;
    } catch (e) {
      console.error('[오류] gh CLI 실행 실패:', e.stderr || e.message);
      process.exit(1);
    }

  } else if (platform === 'gitlab') {
    const host  = process.env.GITLAB_HOST || 'https://gitlab.com';
    const token = process.env.GITLAB_TOKEN;

    if (!token) {
      console.error('[오류] GITLAB_TOKEN 환경변수가 설정되지 않았습니다.');
      console.error('  export GITLAB_TOKEN=your_personal_access_token');
      process.exit(1);
    }

    const projectPath = encodeURIComponent(`${owner}/${repo}`);
    const payload = JSON.stringify({
      source_branch: head,
      target_branch: base,
      title,
      description: body,
      assignee_ids: [],
    });

    const url = `${host}/api/v4/projects/${projectPath}/merge_requests`;
    const result = await request(url, {
      method: 'POST',
      headers: {
        'PRIVATE-TOKEN': token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);

    console.log(`✅ PR 생성 완료`);
    console.log(`PR URL: ${result.web_url}`);
    return result.web_url;

  } else {
    console.error(`[오류] 지원하지 않는 플랫폼: ${platform}`);
    console.error('  지원 플랫폼: gitea | github | gitlab');
    process.exit(1);
  }
}

createPR().catch(e => {
  console.error('[오류]', e.message);
  process.exit(1);
});
