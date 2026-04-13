---
name: harness-analysis
description: >
  하네스 시범운행 분석 스킬. start/end/sync 3개 커맨드로 구성.
  start: 구간 시작 기록 (브랜치, 커밋 해시, 시각)
  end: git 이력 + 품질 지표 수집 후 리포트 생성
  sync: 리포트를 harness-lab DB에 업로드
  harness-log와 컨텍스트를 공유하지 않으며 .harness-lab/analysis/ 에만 기록합니다.
version: 1.2.0
---

# Harness Analysis

하네스 시범운행의 시작부터 끝까지 구간을 측정하고 리포트를 생성합니다.
harness-log와 완전히 독립적으로 동작하며 `.harness-lab/analysis/` 디렉토리만 사용합니다.

---

## 커맨드

### start

시범운행 구간을 시작합니다.

```bash
# 현재 상태 수집
git branch --show-current          # 브랜치명
git rev-parse HEAD                 # 현재 커밋 해시
date -u +%Y-%m-%dT%H:%M:%SZ       # 시작 시각 (UTC)
```

`.harness-lab/analysis/session.json` 에 저장:

```json
{
  "branch": "feat/...",
  "start_commit": "abc1234",
  "started_at": "2026-04-10T09:00:00Z"
}
```

디렉토리가 없으면 생성합니다:
```
.harness-lab/
  analysis/
    session.json
    reports/
```

완료 후: "시범운행 시작됨. 작업 후 /harness-analysis end 를 실행하세요." 출력.

---

### end

구간을 종료하고 리포트를 생성합니다.

#### 1. session.json 읽기

`.harness-lab/analysis/session.json` 이 없으면 "먼저 /harness-analysis start 를 실행하세요." 출력 후 종료.

#### 2. git 이력 수집

```bash
# 구간 내 커밋 목록
git log <start_commit>..HEAD --oneline

# 변경 통계
git diff <start_commit>..HEAD --stat

# 변경 파일 수, 삽입/삭제 라인 수
git diff <start_commit>..HEAD --shortstat
```

#### 3. PR 정보 수집 (gh CLI 있는 경우)

```bash
gh pr list --head <branch> --state all --json number,title,url,state --limit 1
```

gh CLI 없거나 PR 없으면 `null` 처리.

#### 4. 품질 지표 수집

아래 순서로 확인합니다:

- `.security-cleared` 파일 존재 여부 → security-guard PASS 여부 판단
- `git log <start_commit>..HEAD --oneline` 커밋 메시지에서 REJECT 키워드 탐지
- 커밋 수 대비 테스트 파일 변경 비율 계산:
  ```bash
  git diff <start_commit>..HEAD --name-only | grep -E '\.(test|spec)\.' | wc -l
  git diff <start_commit>..HEAD --name-only | wc -l
  ```

#### 5. 토큰 사용량 + 스킬 발동 횟수 + REJECT 비율 + 효율 지표 수집

Claude Code 세션 JSONL에서 start 시각 이후 데이터를 집계합니다.
`code-reviewer`와 `security-guard`는 VERDICT 패턴을 추가로 감지해 reject_rates를 계산합니다.

```bash
node -e "
const fs = require('fs'), path = require('path'), os = require('os');

const startedAt = '<started_at>'; // session.json의 started_at 값으로 치환
const VERDICT_SKILLS = ['code-reviewer', 'security-guard']; // VERDICT 감지 대상
const ALL_GUARD_SKILLS = ['tdd-guard-claude', 'git-guard-claude', 'code-reviewer', 'security-guard']; // 효율 지표 대상

// ~/.claude/projects/ 아래 가장 최근 수정된 .jsonl 찾기
const projectsDir = path.join(os.homedir(), '.claude', 'projects');
let newestFile = null, newestMtime = 0;
fs.readdirSync(projectsDir).forEach(proj => {
  const dir = path.join(projectsDir, proj);
  try {
    fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).forEach(f => {
      const fp = path.join(dir, f);
      const { mtimeMs } = fs.statSync(fp);
      if (mtimeMs > newestMtime) { newestMtime = mtimeMs; newestFile = fp; }
    });
  } catch(e) {}
});

if (!newestFile) { console.log(JSON.stringify({ tokens: null, skill_invocations: {}, reject_rates: {}, guard_invocations: 0, total_invocations: 0 })); process.exit(0); }

const lines = fs.readFileSync(newestFile, 'utf8').trim().split('\n');
let inputTokens = 0, outputTokens = 0, cacheRead = 0, cacheCreation = 0;
const skillCounts = {};
const rejectRates = {};
let lastGuardSkill = null;
let guardInvocations = 0;
let totalInvocations = 0;

lines.forEach(l => {
  try {
    const obj = JSON.parse(l);
    if (obj.timestamp && obj.timestamp < startedAt) return;

    // 토큰 합산
    const u = obj.message?.usage;
    if (u) {
      inputTokens += u.input_tokens || 0;
      outputTokens += u.output_tokens || 0;
      cacheRead += u.cache_read_input_tokens || 0;
      cacheCreation += u.cache_creation_input_tokens || 0;
    }

    const content = obj.message?.content;
    if (Array.isArray(content)) {
      content.forEach(c => {
        // 스킬 발동 카운트
        if (c.type === 'tool_use' && c.name === 'Skill' && c.input?.skill) {
          const sk = c.input.skill;
          skillCounts[sk] = (skillCounts[sk] || 0) + 1;
          totalInvocations++;
          if (ALL_GUARD_SKILLS.includes(sk)) guardInvocations++;
          if (VERDICT_SKILLS.includes(sk)) {
            if (!rejectRates[sk]) rejectRates[sk] = { runs: 0, reject: 0 };
            rejectRates[sk].runs++;
            lastGuardSkill = sk;
          }
        }
        // VERDICT 감지 — 직전에 발동된 guard 스킬에 귀속
        if (c.type === 'text' && c.text && lastGuardSkill) {
          if (/VERDICT:\s*REJECT/i.test(c.text)) {
            rejectRates[lastGuardSkill].reject++;
            lastGuardSkill = null;
          } else if (/VERDICT:\s*PASS/i.test(c.text)) {
            lastGuardSkill = null;
          }
        }
      });
    }
  } catch(e) {}
});

// reject_rate 계산
Object.keys(rejectRates).forEach(sk => {
  const r = rejectRates[sk];
  r.rate = r.runs > 0 ? Math.round((r.reject / r.runs) * 100) / 100 : null;
});

console.log(JSON.stringify({
  tokens: { input: inputTokens, output: outputTokens, cache_read: cacheRead, cache_creation: cacheCreation, total: inputTokens + outputTokens + cacheRead + cacheCreation },
  skill_invocations: skillCounts,
  reject_rates: rejectRates,
  guard_invocations: guardInvocations,
  total_invocations: totalInvocations
}));
"
```

스크립트 결과(`guard_invocations`, `total_invocations`)와 Step 2의 git diff 통계(`insertions`, `deletions`)를 조합해 효율 지표를 계산합니다:

```
loc = insertions + deletions
guard_invocations_per_loc = loc > 0 ? round(guard_invocations / loc, 2) : null
total_invocations_per_loc = loc > 0 ? round(total_invocations / loc, 2) : null
```

결과를 `quality.efficiency` 오브젝트에 포함합니다.

#### 5.5. baseline.json 업데이트 및 overhead_flag 판정

경로: `.harness-lab/analysis/baseline.json`

파일이 없으면 빈 sessions 배열로 초기화합니다.

```json
{
  "sessions": [
    { "date": "YYYY-MM-DD", "guard_invocations_per_loc": 0.05 }
  ]
}
```

**업데이트 규칙:**
1. 현재 세션의 `guard_invocations_per_loc`이 `null`이 아닌 경우에만 sessions에 추가
2. sessions는 최근 5개만 유지 (오래된 것부터 제거)
3. 5개 평균(`baseline_avg`)을 계산
4. `overhead_flag = guard_invocations_per_loc > baseline_avg * 2` (baseline_avg가 0이면 false)

```bash
node -e "
const fs = require('fs');
const BASELINE_PATH = '.harness-lab/analysis/baseline.json';
const guardPerLoc = <guard_invocations_per_loc>; // 계산된 값으로 치환
const today = '<YYYY-MM-DD>';

let baseline = { sessions: [] };
try { baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')); } catch(e) {}

let overheadFlag = false;
let baselineAvg = null;

if (guardPerLoc !== null) {
  baseline.sessions.push({ date: today, guard_invocations_per_loc: guardPerLoc });
  if (baseline.sessions.length > 5) baseline.sessions = baseline.sessions.slice(-5);
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2));
}

if (baseline.sessions.length > 0) {
  const vals = baseline.sessions.map(s => s.guard_invocations_per_loc).filter(v => v !== null);
  baselineAvg = vals.length > 0 ? Math.round((vals.reduce((a,b) => a+b, 0) / vals.length) * 100) / 100 : null;
  overheadFlag = (baselineAvg !== null && baselineAvg > 0 && guardPerLoc !== null) ? guardPerLoc > baselineAvg * 2 : false;
}

console.log(JSON.stringify({ baseline_avg: baselineAvg, overhead_flag: overheadFlag }));
"
```

#### 6. 리포트 생성

경로: `.harness-lab/analysis/reports/YYYY-MM-DD.json`
같은 날짜 파일이 있으면 덮어씁니다.

```json
{
  "date": "YYYY-MM-DD",
  "branch": "feat/...",
  "started_at": "2026-04-10T09:00:00Z",
  "ended_at": "2026-04-10T17:00:00Z",
  "git": {
    "start_commit": "abc1234",
    "end_commit": "def5678",
    "commit_count": 5,
    "commits": [
      { "hash": "def5678", "message": "feat: add analysis tab" }
    ],
    "files_changed": 12,
    "insertions": 340,
    "deletions": 120
  },
  "pr": {
    "number": 42,
    "title": "feat: harness-analysis",
    "url": "https://github.com/...",
    "state": "open"
  },
  "quality": {
    "security_guard": "PASS",
    "test_file_ratio": 0.25,
    "tokens": {
      "input": 1200,
      "output": 340,
      "cache_read": 45000,
      "cache_creation": 800,
      "total": 47340
    },
    "skill_invocations": {
      "tdd-guard-claude": 3,
      "git-guard-claude": 1,
      "code-reviewer": 2,
      "security-guard": 1
    },
    "reject_rates": {
      "code-reviewer": { "runs": 2, "reject": 1, "rate": 0.5 },
      "security-guard": { "runs": 1, "reject": 0, "rate": 0.0 }
    },
    "efficiency": {
      "guard_invocations_per_loc": 0.03,
      "total_invocations_per_loc": 0.04,
      "baseline_avg": 0.02,
      "overhead_flag": true
    }
  }
}
```

`pr`이 없으면 `null`, `security_guard`를 판단할 수 없으면 `"UNKNOWN"`.

#### 6. session.json 삭제

리포트 저장 후 session.json을 삭제합니다 (구간 초기화).

완료 후: 리포트 요약을 출력합니다.

---

### sync

`.harness-lab/analysis/reports/` 의 리포트를 원격 서버에 업로드합니다.

> **주의: curl+jq 사용 금지. 반드시 node -e 인라인 스크립트 사용.**

```bash
node -e "
const fs = require('fs');
const https = require('https');
const BASE = process.env.VITE_API_URL || 'https://skill-marketplace-umzq.onrender.com';

function post(path, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const url = new URL(path, BASE);
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => { console.log(path, res.statusCode); resolve(); });
    });
    req.on('error', e => { console.error(path, e.message); resolve(); });
    req.write(data);
    req.end();
  });
}

async function main() {
  const files = fs.readdirSync('.harness-lab/analysis/reports/').filter(f => f.endsWith('.json'));
  for (const file of files) {
    const report = JSON.parse(fs.readFileSync('.harness-lab/analysis/reports/' + file, 'utf8'));
    await post('/api/harness/analysis', report);
  }
  console.log('sync complete');
}
main();
"
```

서버 응답 실패 시 에러만 출력하고 계속 진행합니다.
