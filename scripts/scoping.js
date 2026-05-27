#!/usr/bin/env node
/**
 * scoping.js — 변경 예정 함수/파일/feature의 영향 범위를 call-graph 기반으로 분석
 *
 * 사용법:
 *   node scripts/scoping.js authenticate          # 함수명
 *   node scripts/scoping.js middleware/auth.js    # 파일 경로
 *   node scripts/scoping.js skill-download        # feature명
 *   node scripts/scoping.js "POST /"              # 라우트 패턴
 */

const fs   = require('fs');
const path = require('path');

const ROOT       = path.resolve(__dirname, '..');
const GRAPH_FILE = path.join(ROOT, '.harness-lab', 'call-graph.json');

function loadGraph() {
  if (!fs.existsSync(GRAPH_FILE)) {
    console.error('call-graph.json 없음 — node scripts/update-call-graph.js 를 먼저 실행하세요.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'));
}

function short(f) {
  return f.replace('backend/src/', '');
}

function printMethod(file, mName, method, graph) {
  const tag = method.isRoute ? 'ROUTE' : 'FUNC ';
  console.log(`\n  [${tag}] ${mName}  (${short(file)}:${method.line})`);
  if (method.feature) console.log(`           @feature : ${method.feature}`);

  if (method.calls?.length) {
    console.log(`           호출     : ${method.calls.map(r => r.slice(r.indexOf('::') + 2) + ' (' + short(r.slice(0, r.indexOf('::'))) + ')').join('\n                      ')}`);
  }

  if (method.called_by?.length) {
    const callerLines = method.called_by.map(r => {
      const sep  = r.indexOf('::');
      const f    = r.slice(0, sep);
      const m    = r.slice(sep + 2);
      const feat = graph.nodes[f]?.methods?.[m]?.feature;
      return `${m}${feat ? ' [' + feat + ']' : ''}  (${short(f)})`;
    });
    console.log(`           호출됨   : ${callerLines.join('\n                      ')}`);
  }

  if (method.affects_features?.length) {
    console.log(`           영향 feat: ${method.affects_features.join(', ')}`);
  } else {
    console.log(`           영향 feat: (없음)`);
  }
}

function main() {
  const query = process.argv[2];

  if (!query) {
    console.log(`사용법: node scripts/scoping.js <query>

  query 형식
    함수명     authenticate
    파일       middleware/auth.js
    feature    skill-download
    라우트     "GET /"
    전체       --all`);
    process.exit(0);
  }

  const graph = loadGraph();
  const results = [];

  for (const [file, node] of Object.entries(graph.nodes)) {
    const fileMatch = file.includes(query);

    // --all 플래그: 메서드가 있는 모든 파일
    if (query === '--all') {
      if (node.methods) {
        for (const [mName, method] of Object.entries(node.methods)) {
          results.push({ file, mName, method });
        }
      }
      continue;
    }

    if (!node.methods) {
      if (fileMatch) {
        // 메서드 없는 파일 — 파일 레벨 정보
        console.log(`\n📄 ${short(file)}`);
        if (node.affects_features?.length) console.log(`   영향 feature: ${node.affects_features.join(', ')}`);
        if (node.imported_by?.length)      console.log(`   imported by : ${node.imported_by.map(short).join(', ')}`);
      }
      continue;
    }

    for (const [mName, method] of Object.entries(node.methods)) {
      const nameMatch    = mName.toLowerCase().includes(query.toLowerCase());
      const featureMatch = method.feature === query || method.affects_features?.includes(query);
      if (fileMatch || nameMatch || featureMatch) {
        results.push({ file, mName, method });
      }
    }
  }

  if (results.length === 0) {
    console.log(`"${query}" — 일치하는 메서드/파일/feature 없음`);
    console.log('\n힌트: authenticate / middleware/auth.js / skill-upload / "POST /"');
    process.exit(1);
  }

  // 요약 헤더
  const allFeatures = [...new Set(results.flatMap(r => r.method.affects_features || []))];
  console.log(`\n🔍 scoping: "${query}"  (${results.length}개 메서드)`);
  if (allFeatures.length) {
    console.log(`   수정 시 영향받는 feature: ${allFeatures.join(', ')}`);
  }
  console.log('─'.repeat(60));

  for (const { file, mName, method } of results) {
    printMethod(file, mName, method, graph);
  }

  console.log('');
}

main();
