#!/usr/bin/env node
/**
 * update-call-graph.js
 *
 * .harness-lab/call-graph.json 을 생성/갱신한다.
 *
 * 사용법:
 *   node scripts/update-call-graph.js           # 전체 빌드
 *   node scripts/update-call-graph.js --changed  # git diff --staged 기반 incremental 갱신
 */

const fs   = require('fs');
const path = require('path');
const cp   = require('child_process');

const ROOT      = path.resolve(__dirname, '..');
const OUT_FILE  = path.join(ROOT, '.harness-lab', 'call-graph.json');
const INCREMENTAL = process.argv.includes('--changed');

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function currentCommit() {
  try { return cp.execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim(); } catch { return 'unknown'; }
}

/** git ls-files 로 추적 중인 .js/.ts 파일 전체 반환 */
function allTrackedFiles() {
  return cp.execSync('git ls-files', { cwd: ROOT })
    .toString().trim().split('\n')
    .filter(f => /\.(js|ts)$/.test(f));
}

/** git diff --staged 로 변경된 .js/.ts 파일 반환 */
function stagedFiles() {
  return cp.execSync('git diff --staged --name-only', { cwd: ROOT })
    .toString().trim().split('\n')
    .filter(f => /\.(js|ts)$/.test(f));
}

/**
 * 파일 하나를 파싱해서 { imports: string[], features: string[] } 반환
 * imports  : 이 파일이 직접 import/require 하는 프로젝트 내 파일 (정규화된 경로)
 * features : @feature 어노테이션으로 선언된 feature 이름 목록
 */
function parseFile(relPath) {
  const absPath = path.join(ROOT, relPath);
  let content;
  try { content = fs.readFileSync(absPath, 'utf8'); } catch { return null; }

  const lines = content.split('\n');
  const imports  = new Set();
  const features = new Set();

  for (const line of lines) {
    // @feature 어노테이션
    const fm = line.match(/^\s*\/\/\s*@feature\s+(\S+)/);
    if (fm) features.add(fm[1]);

    // import ... from '...'
    const im = line.match(/(?:import\s+.*\s+from\s+|require\s*\()\s*['"]([^'"]+)['"]/);
    if (im) {
      const spec = im[1];
      if (!spec.startsWith('.')) continue; // 외부 패키지 제외

      const dir    = path.dirname(absPath);
      let resolved = path.relative(ROOT, path.resolve(dir, spec)).replace(/\\/g, '/');

      // 확장자 없으면 .js 먼저 시도, 없으면 /index.js
      if (!path.extname(resolved)) {
        if (fs.existsSync(path.join(ROOT, resolved + '.js')))       resolved += '.js';
        else if (fs.existsSync(path.join(ROOT, resolved + '.ts')))  resolved += '.ts';
        else if (fs.existsSync(path.join(ROOT, resolved, 'index.js'))) resolved += '/index.js';
        else continue;
      }

      if (fs.existsSync(path.join(ROOT, resolved))) imports.add(resolved);
    }
  }

  return { imports: [...imports], features: [...features] };
}

// ─── 그래프 빌드 ──────────────────────────────────────────────────────────────

/**
 * nodes 맵 전체를 순회하며 각 노드의 affects_features 를 계산한다.
 * route 파일(features 직접 선언)에서 출발해 imported_by 체인을 역방향으로 전파한다.
 */
/**
 * affects_features 계산 규칙:
 * "이 파일이 바뀌면 어떤 feature가 영향받는가"
 *
 * route 파일(features 직접 선언)에서 출발해
 * 그 파일이 import 하는 파일들로 features 를 전파한다.
 * (routes/auth.js → middleware/auth.js → ... 방향)
 */
function computeAffectsFeatures(nodes) {
  for (const n of Object.values(nodes)) n.affects_features = [...n.features];

  // BFS: features 가 있는 노드에서 imports 방향으로 전파
  const queue = Object.entries(nodes)
    .filter(([, n]) => n.features.length > 0)
    .map(([file]) => file);

  while (queue.length) {
    const file = queue.shift();
    const node = nodes[file];
    if (!node) continue;

    for (const dep of node.imports) {
      const depNode = nodes[dep];
      if (!depNode) continue;

      let changed = false;
      for (const feat of node.affects_features) {
        if (!depNode.affects_features.includes(feat)) {
          depNode.affects_features.push(feat);
          changed = true;
        }
      }
      if (changed) queue.push(dep);
    }
  }
}

function buildGraph(files, existingNodes = {}) {
  const nodes = { ...existingNodes };

  // 대상 파일 파싱
  for (const file of files) {
    const parsed = parseFile(file);
    if (!parsed) {
      delete nodes[file];
      continue;
    }
    nodes[file] = {
      imports:          parsed.imports,
      imported_by:      nodes[file]?.imported_by ?? [],
      features:         parsed.features,
      affects_features: [],
    };
  }

  // imported_by 역방향 엣지 전체 재계산
  // (변경 파일의 imports 가 바뀌었을 수 있으므로 전체 노드 기준으로 rebuild)
  for (const n of Object.values(nodes)) n.imported_by = [];
  for (const [file, node] of Object.entries(nodes)) {
    for (const imp of node.imports) {
      if (nodes[imp]) nodes[imp].imported_by.push(file);
    }
  }

  computeAffectsFeatures(nodes);
  return nodes;
}

// ─── 진입점 ───────────────────────────────────────────────────────────────────

function main() {
  fs.mkdirSync(path.join(ROOT, '.harness-lab'), { recursive: true });

  const existing = readJson(OUT_FILE);
  let nodes;

  if (INCREMENTAL && existing?.nodes) {
    const changed = stagedFiles();
    if (changed.length === 0) {
      console.log('변경된 파일 없음 — call-graph 갱신 불필요');
      return;
    }
    console.log(`incremental 갱신: ${changed.length}개 파일`);
    nodes = buildGraph(changed, existing.nodes);
  } else {
    const all = allTrackedFiles();
    console.log(`전체 빌드: ${all.length}개 파일`);
    nodes = buildGraph(all);
  }

  const out = {
    commit:  currentCommit(),
    updated: new Date().toISOString().slice(0, 10),
    nodes,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log(`call-graph.json 저장 완료: ${OUT_FILE}`);

  // 요약 출력
  const withFeatures = Object.values(nodes).filter(n => n.affects_features.length > 0);
  console.log(`\n노드 수: ${Object.keys(nodes).length}, feature 연결 노드: ${withFeatures.length}`);
}

main();
