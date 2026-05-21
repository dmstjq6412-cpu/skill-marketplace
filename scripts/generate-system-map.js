#!/usr/bin/env node
// 기능지도(system-map) 자동 생성 스크립트
// --json 플래그: stdout에 JSON 출력 (백엔드 API용)
// 플래그 없음: system-map.md 파일 생성

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ROUTES_DIR = path.join(ROOT, 'backend/src/routes');
const CLIENT_FILE = path.join(ROOT, 'frontend/src/api/client.js');
const TESTS_BACKEND = path.join(ROOT, 'backend/tests/routes');
const REQ_DIR = path.join(ROOT, 'docs/requirements');
const OUTPUT = path.join(ROOT, 'system-map.md');

// REQ 파일에서 도메인명 → slug 매핑 빌드 (TD-2: 도메인 레벨 연결)
function buildReqMap() {
  const map = {};
  if (!fs.existsSync(REQ_DIR)) return map;
  fs.readdirSync(REQ_DIR)
    .filter(f => f.startsWith('REQ-') && f.endsWith('.md'))
    .forEach(f => {
      const slug = f.replace(/^REQ-/, '').replace(/\.md$/, '');
      ['auth', 'skills', 'harness', 'download'].forEach(domain => {
        if (slug.includes(domain)) {
          if (!map[domain]) map[domain] = [];
          map[domain].push(slug);
        }
      });
    });
  return map;
}

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

function matchClientFn(method, apiPath, clientFns) {
  const slug = apiPath.replace(/\/:?\w+/g, '').replace(/\//g, '_').replace(/^_/, '');
  const methodMap = {
    GET: ['fetch', 'get'], POST: ['post', 'upload', 'create', 'login', 'exchange'],
    PATCH: ['patch', 'update'], DELETE: ['delete', 'remove'], PUT: ['put', 'update'],
  };
  const prefixes = methodMap[method] || [];
  return clientFns.find(fn =>
    prefixes.some(p => fn.name.toLowerCase().startsWith(p)) &&
    slug.split('_').some(s => s.length > 3 && fn.name.toLowerCase().includes(s.toLowerCase()))
  );
}

function findTestFile(routeFile) {
  const base = path.basename(routeFile, '.js');
  const t = path.join(TESTS_BACKEND, `${base}.test.js`);
  return fs.existsSync(t) ? `backend/tests/routes/${base}.test.js` : null;
}

function main() {
  const isJson = process.argv.includes('--json');
  const routeFiles = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'));
  const clientFns = parseClient(CLIENT_FILE);
  const reqMap = buildReqMap();
  const now = new Date().toISOString().slice(0, 10);

  if (isJson) {
    const domains = [];
    for (const routeFile of routeFiles) {
      const filePath = path.join(ROUTES_DIR, routeFile);
      const routes = parseRoutes(filePath);
      if (routes.length === 0) continue;

      const baseName = path.basename(routeFile, '.js');
      const testFile = findTestFile(routeFile);
      const reqSlugs = reqMap[baseName] || [];

      domains.push({
        name: baseName,
        routes: routes.map(r => {
          const clientFn = matchClientFn(r.method, r.path, clientFns);
          return {
            method: r.method,
            path: r.path,
            description: r.description,
            auth: r.auth,
            logic: `${routeFile}:${r.line}`,
            client_fn: clientFn ? { name: clientFn.name, line: clientFn.line } : null,
            test_file: testFile || null,
            req_slug: reqSlugs.length > 0 ? reqSlugs[0] : null,
          };
        }),
      });
    }
    process.stdout.write(JSON.stringify({ generated_at: now, domains }));
    return;
  }

  // 기존 마크다운 출력 (system-map.md)
  let md = `# System Map\n\n> 자동 생성: ${now} | generate-system-map.js\n\n`;

  for (const routeFile of routeFiles) {
    const filePath = path.join(ROUTES_DIR, routeFile);
    const routes = parseRoutes(filePath);
    if (routes.length === 0) continue;

    const baseName = path.basename(routeFile, '.js');
    const testFile = findTestFile(routeFile);
    const reqSlugs = reqMap[baseName] || [];

    md += `## ${baseName}.js\n\n`;
    md += `| 기능명 | Method | Path | 로직 위치 | 연관 테스트 | REQ | 인증 |\n`;
    md += `|--------|--------|------|-----------|------------|-----|------|\n`;

    for (const r of routes) {
      const clientFn = matchClientFn(r.method, r.path, clientFns);
      const featureName = r.description || `${r.method} ${r.path}`;
      const logicPos = `${routeFile}:${r.line}`;
      const testPos = testFile || '—';
      const reqBadge = reqSlugs.length > 0 ? reqSlugs.map(s => `REQ-${s}`).join(', ') : '—';
      const auth = r.auth ? '🔒' : '🔓';
      const clientInfo = clientFn ? `client.js:${clientFn.line} (${clientFn.name})` : '—';

      md += `| ${featureName} | \`${r.method}\` | \`${r.path}\` | ${logicPos}<br>${clientInfo} | ${testPos} | ${reqBadge} | ${auth} |\n`;
    }
    md += '\n';
  }

  fs.writeFileSync(OUTPUT, md);
  console.log(`system-map.md 생성 완료: ${OUTPUT}`);
}

main();
