#!/usr/bin/env node
/**
 * generate-system-map.js
 *
 * --json 플래그: API용 JSON 출력 (백엔드 API용)
 * 플래그 없음: system-map.md 파일 생성
 *
 * features 배열: docs/features/*.md 파일에서 읽음 (spec 기반)
 * domains 배열: backend/src/routes/*.js 파싱 (코드 기반, route 레벨 상세)
 * call_graph:   .harness-lab/call-graph.json 에서 읽음
 */

const fs   = require('fs');
const path = require('path');

const ROOT            = path.resolve(__dirname, '..');
const ROUTES_DIR      = path.join(ROOT, 'backend/src/routes');
const CLIENT_FILE     = path.join(ROOT, 'frontend/src/api/client.js');
const TESTS_BACKEND   = path.join(ROOT, 'backend/tests/routes');
const FEATURES_DIR    = path.join(ROOT, 'docs/features');
const SCHEMA_FILE     = path.join(ROOT, 'backend/src/db/schema.sql');
const APP_JSX_FILE    = path.join(ROOT, 'frontend/src/App.jsx');
const CALL_GRAPH_FILE = path.join(ROOT, '.harness-lab/call-graph.json');
const OUTPUT          = path.join(ROOT, 'system-map.md');

// ─── Feature 파일 파싱 ───────────────────────────────────────────────────────

function parseSection(content, header) {
  const m = content.match(new RegExp(`## ${header}\\n([\\s\\S]*?)(?=\\n## |$)`));
  return m ? m[1].trim() : '';
}

function readFeatureFile(slug) {
  const filePath = path.join(FEATURES_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');

  // frontmatter 파싱
  const fm = {};
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    for (const line of fmMatch[1].split('\n')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx < 0) continue;
      fm[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim();
    }
  }

  const overviewText  = parseSection(content, 'Overview');
  const flowText      = parseSection(content, 'Implementation Flow');
  const connectedText = parseSection(content, 'Connected');
  const decisionsText = parseSection(content, 'Decisions');
  const changelogText = parseSection(content, 'Changelog');

  const tablesMatch = connectedText.match(/- Tables:\s*(.+)/);
  const pagesMatch  = connectedText.match(/- Pages:\s*(.+)/);
  const reqsMatch   = connectedText.match(/- REQs:\s*(.+)/);

  const tables = tablesMatch
    ? tablesMatch[1].split(',').map(t => t.trim()).filter(t => t && !t.startsWith('('))
    : [];
  const pages = pagesMatch
    ? pagesMatch[1].split(',').map(p => p.trim()).filter(p => p && !p.startsWith('('))
    : [];
  const reqs = reqsMatch
    ? reqsMatch[1].split(',').map(r => r.trim()).filter(r => r && r !== '-')
    : [];

  const decisionsCount = (decisionsText.match(/^### FD-/gm) || []).length;
  const changelogRows  = (changelogText.match(/^\|/gm) || []).length;

  return {
    slug,
    status:    fm.status || 'active',
    sourceReq: (fm['source-req'] && fm['source-req'] !== '-') ? fm['source-req'] : null,
    overview:  overviewText.split('\n')[0],
    flow:      flowText,
    tables,
    pages,
    reqs,
    decisionsCount,
    changelogCount: Math.max(0, changelogRows - 1), // 헤더 행 제외
  };
}

// ─── 코드 파싱 (domains 구성용) ──────────────────────────────────────────────

function parseRoutes(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines   = content.split('\n');
  const routes  = [];
  const routePattern       = /router\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/;
  const authPattern        = /authenticate/;
  const annotationPatterns = {
    feature: /^\/\/\s*@feature\s+(.+)/,
    desc:    /^\/\/\s*@desc\s+(.+)/,
    flow:    /^\/\/\s*@flow\s+(.+)/,
    req:     /^\/\/\s*@req\s+(.+)/,
    table:   /^\/\/\s*@table\s+(.+)/,
    page:    /^\/\/\s*@page\s+(.+)/,
  };

  lines.forEach((line, i) => {
    const match = line.match(routePattern);
    if (!match) return;

    const method  = match[1].toUpperCase();
    const path_   = match[2];
    const hasAuth = authPattern.test(line);
    const ann     = { feature: null, desc: null, req_slug: null, table: null, page: null };

    for (let j = i - 1; j >= Math.max(0, i - 8); j--) {
      const trimmed = lines[j].trim();
      if (trimmed === '') continue;

      let matched = false;
      for (const [key, pattern] of Object.entries(annotationPatterns)) {
        const m = trimmed.match(pattern);
        if (m) {
          const field = key === 'req' ? 'req_slug' : key;
          if (ann[field] === null) ann[field] = m[1].trim();
          matched = true;
          break;
        }
      }
      if (!matched && !trimmed.startsWith('//')) break;
    }

    routes.push({
      method, path: path_, line: i + 1, auth: hasAuth,
      feature:  ann.feature,
      desc:     ann.desc,
      req_slug: ann.req_slug,
      tables:   ann.table ? ann.table.split(',').map(t => t.trim()).filter(Boolean) : [],
      pages:    ann.page  ? ann.page.split(',').map(p => p.trim()).filter(Boolean)  : [],
    });
  });

  return routes;
}

function parseSchema() {
  try {
    const content = fs.readFileSync(SCHEMA_FILE, 'utf8');
    const tables  = [];
    let m;
    const pattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
    while ((m = pattern.exec(content)) !== null) tables.push(m[1]);
    return tables;
  } catch { return []; }
}

function parseAppRoutes() {
  try {
    const content = fs.readFileSync(APP_JSX_FILE, 'utf8');
    const paths   = [];
    let m;
    const pattern = /<Route\s+[^>]*path="([^"]+)"/g;
    while ((m = pattern.exec(content)) !== null) paths.push(m[1]);
    return paths;
  } catch { return []; }
}

function parseClient() {
  try {
    return fs.readFileSync(CLIENT_FILE, 'utf8').split('\n')
      .map((line, i) => ({ m: line.match(/^export const (\w+)/), i }))
      .filter(({ m }) => m)
      .map(({ m, i }) => ({ name: m[1], line: i + 1 }));
  } catch { return []; }
}

function matchClientFn(method, apiPath, clientFns) {
  const slug     = apiPath.replace(/\/:?\w+/g, '').replace(/\//g, '_').replace(/^_/, '');
  const prefixes = { GET: ['fetch', 'get'], POST: ['post', 'upload', 'create', 'login'],
                     PATCH: ['patch', 'update'], DELETE: ['delete', 'remove'], PUT: ['put', 'update'] };
  return clientFns.find(fn =>
    (prefixes[method] || []).some(p => fn.name.toLowerCase().startsWith(p)) &&
    slug.split('_').some(s => s.length > 3 && fn.name.toLowerCase().includes(s.toLowerCase()))
  );
}

function parseTestCases(testFilePath) {
  if (!testFilePath || !fs.existsSync(testFilePath)) return [];
  try {
    const results = [];
    const pattern = /\bit\s*\(\s*(['"`])([\s\S]*?)\1/g;
    let m;
    while ((m = pattern.exec(fs.readFileSync(testFilePath, 'utf8'))) !== null) results.push(m[2]);
    return results;
  } catch { return []; }
}

function findTestFile(routeFile) {
  const base = path.basename(routeFile, '.js');
  const t    = path.join(TESTS_BACKEND, `${base}.test.js`);
  return fs.existsSync(t) ? `backend/tests/routes/${base}.test.js` : null;
}

function readCallGraph() {
  try {
    if (!fs.existsSync(CALL_GRAPH_FILE)) return null;
    return JSON.parse(fs.readFileSync(CALL_GRAPH_FILE, 'utf8'));
  } catch { return null; }
}

// ─── features 배열: Feature 파일 기반 + 코드 데이터 보강 ─────────────────────

function buildFeatures(allRouteGroups) {
  if (!fs.existsSync(FEATURES_DIR)) return [];

  // 코드에서 route 정보 수집 (feature slug별)
  const routeMap = {};
  const testMap  = {};

  for (const { routes, routeFile, testFilePath } of allRouteGroups) {
    const testCases = parseTestCases(testFilePath);
    for (const r of routes) {
      if (!r.feature) continue;
      if (!routeMap[r.feature]) { routeMap[r.feature] = []; testMap[r.feature] = []; }
      routeMap[r.feature].push({
        method: r.method, path: r.path, auth: r.auth,
        logic:  `${path.basename(routeFile)}:${r.line}`,
      });
      testCases.forEach(t => { if (!testMap[r.feature].includes(t)) testMap[r.feature].push(t); });
    }
  }

  // Feature 파일 읽어서 features 배열 구성
  return fs.readdirSync(FEATURES_DIR)
    .filter(f => f.endsWith('.md'))
    .sort()
    .map(file => {
      const slug = file.replace('.md', '');
      const spec = readFeatureFile(slug);
      if (!spec) return null;
      return {
        name:             slug,
        status:           spec.status,
        desc:             spec.overview,
        flow:             spec.flow,
        req_slug:         spec.sourceReq,
        routes:           routeMap[slug] || [],
        tests:            testMap[slug]  || [],
        tables:           spec.tables,
        pages:            spec.pages,
        reqs:             spec.reqs,
        decisions_count:  spec.decisionsCount,
        changelog_count:  spec.changelogCount,
      };
    })
    .filter(Boolean);
}

// ─── 진입점 ──────────────────────────────────────────────────────────────────

function main() {
  const isJson     = process.argv.includes('--json');
  const routeFiles = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'));
  const clientFns  = parseClient();
  const now        = new Date().toISOString().slice(0, 10);

  const allRouteGroups = [];
  const domains        = [];

  for (const routeFile of routeFiles) {
    const filePath   = path.join(ROUTES_DIR, routeFile);
    const routes     = parseRoutes(filePath);
    if (routes.length === 0) continue;

    const baseName    = path.basename(routeFile, '.js');
    const testFileRel = findTestFile(routeFile);
    const testFilePath = testFileRel ? path.join(ROOT, testFileRel) : null;

    allRouteGroups.push({ routes, routeFile, testFilePath });

    domains.push({
      name: baseName,
      routes: routes.map(r => {
        const clientFn = matchClientFn(r.method, r.path, clientFns);
        return {
          method:      r.method,
          path:        r.path,
          description: r.desc || '',
          auth:        r.auth,
          feature:     r.feature,
          logic:       `${routeFile}:${r.line}`,
          client_fn:   clientFn ? { name: clientFn.name, line: clientFn.line } : null,
          test_file:   testFileRel || null,
        };
      }),
    });
  }

  const features       = buildFeatures(allRouteGroups);
  const db_tables      = parseSchema();
  const frontend_routes = parseAppRoutes();
  const callGraph      = readCallGraph();

  if (isJson) {
    const out = { generated_at: now, db_tables, frontend_routes, domains, features };
    if (callGraph) out.call_graph_updated = callGraph.updated;
    process.stdout.write(JSON.stringify(out));
    return;
  }

  // 마크다운 출력
  let md = `# System Map\n\n> 자동 생성: ${now} | generate-system-map.js (spec 기반)\n`;
  if (callGraph) md += `> call-graph: ${callGraph.updated} (${Object.keys(callGraph.nodes).length}개 노드)\n`;
  md += '\n';

  md += `## Features (${features.length}개)\n\n`;
  for (const f of features) {
    md += `### ${f.name} [${f.status}]\n`;
    if (f.desc) md += `${f.desc}\n\n`;
    if (f.routes.length) md += `엔드포인트: ${f.routes.map(r => `\`${r.method} ${r.path}\``).join(', ')}\n`;
    if (f.tables.length) md += `테이블: ${f.tables.join(', ')}\n`;
    if (f.pages.length)  md += `페이지: ${f.pages.join(', ')}\n`;
    if (f.req_slug)      md += `REQ: ${f.req_slug}\n`;
    md += `Decisions: ${f.decisions_count} | Changelog: ${f.changelog_count}\n\n`;
  }

  md += `## Routes by Domain\n\n`;
  for (const d of domains) {
    md += `### ${d.name}.js\n\n`;
    md += `| Method | Path | Feature | 인증 |\n|--------|------|---------|------|\n`;
    for (const r of d.routes) {
      md += `| \`${r.method}\` | \`${r.path}\` | ${r.feature || '—'} | ${r.auth ? '🔒' : '🔓'} |\n`;
    }
    md += '\n';
  }

  if (callGraph) {
    const impacted = Object.entries(callGraph.nodes)
      .filter(([, n]) => n.affects_features.length > 0 && n.features.length === 0)
      .sort((a, b) => b[1].affects_features.length - a[1].affects_features.length)
      .slice(0, 10);

    if (impacted.length) {
      md += `## 공유 코드 영향 범위 (call-graph)\n\n`;
      md += `| 파일 | 영향 feature 수 | 영향 feature |\n|------|----------------|-------------|\n`;
      for (const [file, node] of impacted) {
        md += `| ${file} | ${node.affects_features.length} | ${node.affects_features.slice(0, 5).join(', ')}${node.affects_features.length > 5 ? '...' : ''} |\n`;
      }
    }
  }

  fs.writeFileSync(OUTPUT, md);
  console.log(`system-map.md 생성 완료: ${OUTPUT}`);
}

main();
