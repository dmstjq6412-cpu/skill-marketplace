#!/usr/bin/env node
/**
 * update-call-graph.js v2
 *
 * 파일 레벨 + 메서드 레벨 call-graph를 .harness-lab/call-graph.json에 저장한다.
 *
 * 사용법:
 *   node scripts/update-call-graph.js           # 전체 빌드
 *   node scripts/update-call-graph.js --changed  # git diff --staged 기반 incremental 갱신
 */

const fs   = require('fs');
const path = require('path');
const cp   = require('child_process');

const ROOT        = path.resolve(__dirname, '..');
const OUT_FILE    = path.join(ROOT, '.harness-lab', 'call-graph.json');
const INCREMENTAL = process.argv.includes('--changed');

// acorn 로드 (frontend/node_modules에서)
let acorn;
try {
  acorn = require(path.join(ROOT, 'frontend/node_modules/acorn'));
} catch {
  console.warn('acorn을 찾을 수 없음 — 메서드 레벨 추출 생략');
}

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function currentCommit() {
  try { return cp.execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim(); } catch { return 'unknown'; }
}

function allTrackedFiles() {
  return cp.execSync('git ls-files', { cwd: ROOT })
    .toString().trim().split('\n')
    .filter(f => /\.(js|ts|jsx|tsx)$/.test(f));
}

function stagedFiles() {
  return cp.execSync('git diff --staged --name-only', { cwd: ROOT })
    .toString().trim().split('\n')
    .filter(f => /\.(js|ts|jsx|tsx)$/.test(f));
}

/** 상대 import 경로 → 프로젝트 루트 기준 상대 경로 */
function resolveImport(spec, fromRelPath) {
  if (!spec.startsWith('.')) return null;
  const dir = path.dirname(path.join(ROOT, fromRelPath));
  let resolved = path.relative(ROOT, path.resolve(dir, spec)).replace(/\\/g, '/');
  if (!path.extname(resolved)) {
    if (fs.existsSync(path.join(ROOT, resolved + '.js')))          resolved += '.js';
    else if (fs.existsSync(path.join(ROOT, resolved + '.jsx')))    resolved += '.jsx';
    else if (fs.existsSync(path.join(ROOT, resolved + '.ts')))     resolved += '.ts';
    else if (fs.existsSync(path.join(ROOT, resolved + '.tsx')))    resolved += '.tsx';
    else if (fs.existsSync(path.join(ROOT, resolved, 'index.js')))  resolved += '/index.js';
    else if (fs.existsSync(path.join(ROOT, resolved, 'index.jsx'))) resolved += '/index.jsx';
    else if (fs.existsSync(path.join(ROOT, resolved, 'index.ts')))  resolved += '/index.ts';
    else if (fs.existsSync(path.join(ROOT, resolved, 'index.tsx'))) resolved += '/index.tsx';
    else return null;
  }
  return fs.existsSync(path.join(ROOT, resolved)) ? resolved : null;
}

// ─── 파일 레벨 파싱 ───────────────────────────────────────────────────────────

function parseFile(relPath) {
  const absPath = path.join(ROOT, relPath);
  let content;
  try { content = fs.readFileSync(absPath, 'utf8'); } catch { return null; }

  const imports  = new Set();
  const features = new Set();

  for (const line of content.split('\n')) {
    const fm = line.match(/^\s*\/\/\s*@feature\s+(\S+)/);
    if (fm) features.add(fm[1]);

    const im = line.match(/(?:import\s+.*\s+from\s+|require\s*\()\s*['"]([^'"]+)['"]/);
    if (im) {
      const resolved = resolveImport(im[1], relPath);
      if (resolved) imports.add(resolved);
    }
  }

  return { imports: [...imports], features: [...features] };
}

// ─── AST 기반 메서드 추출 ────────────────────────────────────────────────────

const ROUTER_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);

/** ImportDeclaration 파싱 → { localName: { file, name } } */
function buildImportMap(astBody, fromFile) {
  const map = {};
  for (const node of astBody) {
    if (node.type !== 'ImportDeclaration') continue;
    const file = resolveImport(node.source.value, fromFile);
    if (!file) continue;
    for (const spec of node.specifiers) {
      if (spec.type === 'ImportSpecifier') {
        map[spec.local.name] = { file, name: spec.imported.name };
      } else if (spec.type === 'ImportDefaultSpecifier') {
        map[spec.local.name] = { file, name: 'default' };
      } else if (spec.type === 'ImportNamespaceSpecifier') {
        map[spec.local.name] = { file, name: '*' };
      }
    }
  }
  return map;
}

/**
 * AST 노드를 재귀 탐색해 importMap 기반 호출 관계를 수집한다.
 * identifier() 직접 호출 + obj.method() 멤버 호출 두 패턴을 잡는다.
 */
function collectCalls(node, importMap, calls) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => collectCalls(n, importMap, calls)); return; }

  if (node.type === 'CallExpression') {
    const { callee } = node;
    // authenticate() 형태
    if (callee.type === 'Identifier' && importMap[callee.name]) {
      const { file, name } = importMap[callee.name];
      calls.add(`${file}::${name}`);
    }
    // pool.query() / jwt.verify() 형태
    if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
      if (importMap[callee.object.name]) {
        calls.add(`${importMap[callee.object.name].file}::${callee.property.name}`);
      }
    }
  }

  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
    const child = node[key];
    if (child && typeof child === 'object') collectCalls(child, importMap, calls);
  }
}

/**
 * backend/src/ 파일 하나에서 메서드 목록을 AST로 추출한다.
 * Returns: { methodName: { calls, line, isRoute, feature? } }
 */
function parseFileMethods(relPath) {
  if (!acorn || !relPath.startsWith('backend/src/')) return {};

  let content;
  try { content = fs.readFileSync(path.join(ROOT, relPath), 'utf8'); } catch { return {}; }

  let ast;
  try {
    ast = acorn.parse(content, { ecmaVersion: 2022, sourceType: 'module', locations: true });
  } catch { return {}; }

  const importMap   = buildImportMap(ast.body, relPath);
  const methods     = {};

  // @feature 어노테이션 라인 맵 { lineNum: featureName }
  const featureByLine = {};
  content.split('\n').forEach((l, i) => {
    const m = l.match(/^\s*\/\/\s*@feature\s+(\S+)/);
    if (m) featureByLine[i + 1] = m[1];
  });

  function addMethod(name, bodyNode, line, isRoute) {
    const calls = new Set();
    collectCalls(bodyNode, importMap, calls);
    methods[name] = { calls: [...calls], line, isRoute };
  }

  function walkNode(node) {
    if (!node || typeof node !== 'object') return;

    // function name() {}
    if (node.type === 'FunctionDeclaration' && node.id) {
      addMethod(node.id.name, node.body, node.loc.start.line, false);
      return;
    }

    // const name = () => {} or function() {}
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        if (decl.id?.type !== 'Identifier') continue;
        const init = decl.init;
        if (init?.type === 'ArrowFunctionExpression' || init?.type === 'FunctionExpression') {
          addMethod(decl.id.name, init.body ?? init, node.loc.start.line, false);
        }
      }
      return;
    }

    // router.METHOD('/path', [mw...], handler)
    if (node.type === 'ExpressionStatement') {
      const expr = node.expression;
      if (
        expr?.type === 'CallExpression' &&
        expr.callee?.type === 'MemberExpression' &&
        expr.callee.object?.name === 'router' &&
        ROUTER_METHODS.has(expr.callee.property?.name)
      ) {
        const httpMethod = expr.callee.property.name.toUpperCase();
        const routePath  = expr.arguments[0]?.type === 'Literal' ? expr.arguments[0].value : '?';
        const name       = `handler@${httpMethod} ${routePath}`;
        const line       = node.loc.start.line;
        const calls      = new Set();

        // 미들웨어 인수 (경로와 핸들러 사이)
        for (let i = 1; i < expr.arguments.length - 1; i++) {
          const arg = expr.arguments[i];
          if (arg.type === 'Identifier' && importMap[arg.name]) {
            const { file, name: n } = importMap[arg.name];
            calls.add(`${file}::${n}`);
          }
        }

        // 핸들러 함수 바디
        const handlerArg = expr.arguments[expr.arguments.length - 1];
        if (handlerArg?.type === 'ArrowFunctionExpression' || handlerArg?.type === 'FunctionExpression') {
          collectCalls(handlerArg.body ?? handlerArg, importMap, calls);
        } else if (handlerArg?.type === 'Identifier' && importMap[handlerArg.name]) {
          const { file, name: n } = importMap[handlerArg.name];
          calls.add(`${file}::${n}`);
        }

        // 이 route 위 8라인 내 @feature 연결
        let feature = null;
        for (let l = line - 1; l >= Math.max(1, line - 8); l--) {
          if (featureByLine[l]) { feature = featureByLine[l]; break; }
        }

        methods[name] = { calls: [...calls], line, isRoute: true, ...(feature && { feature }) };
        return;
      }
    }

    // export { ... } 내부 declaration 처리
    if (node.type === 'ExportNamedDeclaration' && node.declaration) {
      walkNode(node.declaration);
      return;
    }
    if (node.type === 'ExportDefaultDeclaration' && node.declaration) {
      walkNode(node.declaration);
    }
  }

  for (const node of ast.body) walkNode(node);
  return methods;
}

// ─── 메서드 레벨 called_by + affects_features ────────────────────────────────

/** methods.calls 역방향으로 called_by 구축 */
function buildCalledBy(nodes) {
  for (const node of Object.values(nodes)) {
    if (!node.methods) continue;
    for (const m of Object.values(node.methods)) m.called_by = [];
  }

  for (const [file, node] of Object.entries(nodes)) {
    if (!node.methods) continue;
    for (const [mName, method] of Object.entries(node.methods)) {
      for (const ref of method.calls) {
        const sep = ref.indexOf('::');
        if (sep < 0) continue;
        const targetFile   = ref.slice(0, sep);
        const targetMethod = ref.slice(sep + 2);
        if (nodes[targetFile]?.methods?.[targetMethod]) {
          nodes[targetFile].methods[targetMethod].called_by.push(`${file}::${mName}`);
        }
      }
    }
  }
}

/** route handler의 @feature에서 calls 체인으로 affects_features 전파 (BFS) */
function computeMethodAffectsFeatures(nodes) {
  for (const node of Object.values(nodes)) {
    if (!node.methods) continue;
    for (const m of Object.values(node.methods)) {
      m.affects_features = m.feature ? [m.feature] : [];
    }
  }

  const queue = [];
  for (const [file, node] of Object.entries(nodes)) {
    if (!node.methods) continue;
    for (const [name, m] of Object.entries(node.methods)) {
      if (m.feature) queue.push({ file, name });
    }
  }

  while (queue.length) {
    const { file, name } = queue.shift();
    const method = nodes[file]?.methods?.[name];
    if (!method) continue;

    for (const ref of method.calls) {
      const sep = ref.indexOf('::');
      if (sep < 0) continue;
      const tFile   = ref.slice(0, sep);
      const tMethod = ref.slice(sep + 2);
      const target  = nodes[tFile]?.methods?.[tMethod];
      if (!target) continue;

      let changed = false;
      for (const feat of method.affects_features) {
        if (!target.affects_features.includes(feat)) {
          target.affects_features.push(feat);
          changed = true;
        }
      }
      if (changed) queue.push({ file: tFile, name: tMethod });
    }
  }
}

// ─── 파일 레벨 affects_features ──────────────────────────────────────────────

function computeAffectsFeatures(nodes) {
  for (const n of Object.values(nodes)) n.affects_features = [...n.features];

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

// ─── 그래프 빌드 ──────────────────────────────────────────────────────────────

function buildGraph(files, existingNodes = {}) {
  const nodes = { ...existingNodes };

  for (const file of files) {
    const parsed = parseFile(file);
    if (!parsed) { delete nodes[file]; continue; }
    nodes[file] = {
      imports:          parsed.imports,
      imported_by:      nodes[file]?.imported_by ?? [],
      features:         parsed.features,
      affects_features: [],
    };
  }

  // imported_by 재계산
  for (const n of Object.values(nodes)) n.imported_by = [];
  for (const [file, node] of Object.entries(nodes)) {
    for (const imp of node.imports) {
      if (nodes[imp]) nodes[imp].imported_by.push(file);
    }
  }

  computeAffectsFeatures(nodes);

  // 메서드 레벨 추가 (acorn 있을 때만)
  if (acorn) {
    for (const file of Object.keys(nodes)) {
      const methods = parseFileMethods(file);
      if (Object.keys(methods).length > 0) nodes[file].methods = methods;
    }
    buildCalledBy(nodes);
    computeMethodAffectsFeatures(nodes);
  }

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
    version: 2,
    commit:  currentCommit(),
    updated: new Date().toISOString().slice(0, 10),
    nodes,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log(`call-graph.json 저장 완료: ${OUT_FILE}`);

  // 요약
  const withFeatures = Object.values(nodes).filter(n => n.affects_features.length > 0);
  const withMethods  = Object.values(nodes).filter(n => n.methods);
  const totalMethods = withMethods.reduce((s, n) => s + Object.keys(n.methods).length, 0);
  console.log(`\n노드 수: ${Object.keys(nodes).length} | feature 연결: ${withFeatures.length} | 메서드 추출 파일: ${withMethods.length} | 메서드 수: ${totalMethods}`);
}

main();
