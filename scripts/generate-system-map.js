#!/usr/bin/env node
// 기능지도(system-map.md) 자동 생성 스크립트
// 트리거: push.md Step 0 — 라우트/client.js 변경 시 조건부 실행

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ROUTES_DIR = path.join(ROOT, 'backend/src/routes');
const CLIENT_FILE = path.join(ROOT, 'frontend/src/api/client.js');
const TESTS_BACKEND = path.join(ROOT, 'backend/tests/routes');
const TESTS_FRONTEND = path.join(ROOT, 'frontend/src/__tests__');
const OUTPUT = path.join(ROOT, 'system-map.md');

// 라우트 파일에서 엔드포인트 파싱
function parseRoutes(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const routes = [];
  const routePattern = /router\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/;
  const authPattern = /authenticate/;

  lines.forEach((line, i) => {
    const match = line.match(routePattern);
    if (!match) return;
    const method = match[1].toUpperCase();
    const path_ = match[2];
    const hasAuth = authPattern.test(line);

    // 위 줄에서 주석 찾기 (// 로 시작하는 줄)
    let description = '';
    for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
      const commentMatch = lines[j].trim().match(/^\/\/\s*(.+)/);
      if (commentMatch) { description = commentMatch[1].trim(); break; }
      if (lines[j].trim() !== '') break;
    }

    routes.push({ method, path: path_, line: i + 1, auth: hasAuth, description });
  });

  return routes;
}

// client.js에서 함수 파싱
function parseClient(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const functions = [];
  lines.forEach((line, i) => {
    const match = line.match(/^export const (\w+)/);
    if (match) functions.push({ name: match[1], line: i + 1 });
  });
  return functions;
}

// API 경로로 client 함수 매핑
function matchClientFn(method, apiPath, clientFns) {
  const slug = apiPath.replace(/\/:?\w+/g, '').replace(/\//g, '_').replace(/^_/, '');
  const methodMap = { GET: ['fetch', 'get'], POST: ['post', 'upload', 'create', 'login', 'exchange'],
    PATCH: ['patch', 'update'], DELETE: ['delete', 'remove'], PUT: ['put', 'update'] };
  const prefixes = methodMap[method] || [];
  return clientFns.find(fn =>
    prefixes.some(p => fn.name.toLowerCase().startsWith(p)) &&
    slug.split('_').some(s => s.length > 3 && fn.name.toLowerCase().includes(s.toLowerCase()))
  );
}

// 테스트 파일 매핑
function findTestFile(routeFile, isBackend) {
  const base = path.basename(routeFile, '.js');
  if (isBackend) {
    const t = path.join(TESTS_BACKEND, `${base}.test.js`);
    return fs.existsSync(t) ? `backend/tests/routes/${base}.test.js` : null;
  }
  const t = path.join(TESTS_FRONTEND, `${base}.test.js`);
  const tx = path.join(TESTS_FRONTEND, `${base}.test.jsx`);
  if (fs.existsSync(tx)) return `frontend/src/__tests__/${base}.test.jsx`;
  if (fs.existsSync(t)) return `frontend/src/__tests__/${base}.test.js`;
  return null;
}

// UI 컴포넌트 매핑
function findUIComponent(routeFile, apiPath) {
  if (routeFile.includes('harness')) return 'HarnessLabPage.jsx';
  if (routeFile.includes('skills') || routeFile.includes('download')) return 'SkillCard.jsx / SkillDetailPage.jsx';
  if (routeFile.includes('auth')) return 'App.jsx (auth flow)';
  return null;
}

function main() {
  const routeFiles = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'));
  const clientFns = parseClient(CLIENT_FILE);
  const now = new Date().toISOString().slice(0, 10);

  let md = `# System Map\n\n> 자동 생성: ${now} | generate-system-map.js\n\n`;

  for (const routeFile of routeFiles) {
    const filePath = path.join(ROUTES_DIR, routeFile);
    const routes = parseRoutes(filePath);
    if (routes.length === 0) continue;

    const baseName = path.basename(routeFile, '.js');
    const testFile = findTestFile(routeFile, true);

    md += `## ${baseName}.js\n\n`;
    md += `| 기능명 | Method | Path | 로직 위치 | 연관 파일 | 연관 테스트 | 인증 |\n`;
    md += `|--------|--------|------|-----------|-----------|------------|------|\n`;

    for (const r of routes) {
      const clientFn = matchClientFn(r.method, r.path, clientFns);
      const uiComp = findUIComponent(routeFile, r.path);
      const relatedFiles = [
        clientFn ? `client.js:${clientFn.line} (${clientFn.name})` : null,
        uiComp,
      ].filter(Boolean).join('<br>');

      const featureName = r.description || `${r.method} ${r.path}`;
      const logicPos = `${routeFile}:${r.line}`;
      const testPos = testFile || '—';
      const auth = r.auth ? '🔒' : '🔓';

      md += `| ${featureName} | \`${r.method}\` | \`${r.path}\` | ${logicPos} | ${relatedFiles || '—'} | ${testPos} | ${auth} |\n`;
    }
    md += '\n';
  }

  // client.js 함수 중 라우트 매핑 안 된 것
  md += `## client.js (프론트엔드 API)\n\n`;
  md += `| 함수명 | 위치 | 연관 테스트 |\n`;
  md += `|--------|------|------------|\n`;
  const clientTest = 'frontend/src/__tests__/client.test.js';
  for (const fn of clientFns) {
    md += `| \`${fn.name}\` | client.js:${fn.line} | ${clientTest} |\n`;
  }
  md += '\n';

  fs.writeFileSync(OUTPUT, md);
  console.log(`system-map.md 생성 완료: ${OUTPUT}`);
}

main();
