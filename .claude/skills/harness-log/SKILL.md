---
name: harness-log
description: >
  Harness Lab 세션 일지 저장 스킬. 현재 대화 내용을 요약하여
  .harness-lab/logs/YYYY-MM-DD.md 에 저장하고,
  블루프린트 스냅샷을 .harness-lab/blueprints/YYYY-MM-DD.json 에 저장합니다.
  HarnessLabPage UI의 핸드오프 흐름과 동기화된 섹션 구조를 사용합니다.
version: 2.4.0
cost: light # 파일 읽기/쓰기 + API 호출, 서브에이전트 없음
---

# Harness Log — 세션 일지 저장

이 스킬이 호출되면 **현재 대화를 분석**하여 Harness Lab 일지를 로컬 파일에 저장합니다.
저장된 일지는 Marketplace의 Harness Lab 페이지(`HarnessLabPage.jsx`)에서 조회 및 핸드오프에 사용됩니다.

## 중요: UI 동기화 규칙

일지의 섹션 이름은 아래 정의를 **정확히** 따라야 합니다.
- 백엔드(`backend/src/routes/harness.js`)가 `## 작업 요약` 헤더로 summary를 파싱합니다.
- 프론트엔드(`HarnessLabPage.jsx`)의 `extractSection`이 `## 다음 프롬프트` 헤더로 프롬프트를 추출합니다.
- 프론트엔드 wrapup 가이드가 보여주는 권장 섹션과 일치해야 합니다.

## 실행 절차

### 1. 오늘 날짜 확인
- `date +%Y-%m-%d` 형식으로 오늘 날짜를 확인합니다.

### 2. .harness-lab 디렉토리 준비
아래 디렉토리가 없으면 생성합니다:
```
.harness-lab/
  logs/
  blueprints/
```

### 3. 대화 분석 후 일지 작성

현재 대화 전체를 검토하여 다음 섹션을 채웁니다:

**작업 요약**: 이 세션에서 실제로 구현/논의/결정된 내용을 구체적으로 한 줄로 기술합니다. 백엔드가 이 섹션의 첫 120자를 summary로 파싱하므로, 핵심 내용을 앞에 배치합니다.

**오늘 논의**: 이 세션에서 논의된 주요 주제, 사용자가 던진 질문/관점을 정리합니다.

**오늘 구현**: 실제로 코드를 작성/수정한 내용을 파일 경로와 함께 구체적으로 나열합니다.

**결정한 것**: 이 세션에서 내린 설계/구현 결정 사항을 기록합니다.

**막힌 점**: 해결하지 못한 이슈, 블로커, 추가 조사가 필요한 항목을 기록합니다. 없으면 "없음"으로 기록합니다.

**내일 바로 할 일**: 다음 세션에서 바로 시작할 작업을 우선순위 순으로 나열합니다.

**다음 프롬프트**: 다음 에이전트가 이 세션을 이어받을 때 사용할 프롬프트를 작성합니다. 프론트엔드의 "다음 에이전트 프롬프트 복사" 버튼이 이 섹션을 추출하므로, 구체적이고 실행 가능한 지시문으로 작성합니다.

### 4. 일지 파일 저장

경로: `.harness-lab/logs/YYYY-MM-DD.md`

형식:
```markdown
# Harness Lab — YYYY-MM-DD

## 작업 요약
<!-- 백엔드가 파싱하는 summary — 핵심 내용을 앞에, 120자 이내 권장 -->

## 오늘 논의
<!-- 주요 논의 주제, 사용자 질문/관점 -->

## 오늘 구현
<!-- 실제 구현한 코드/파일 목록 -->

## 결정한 것
<!-- 설계/구현 결정 사항 -->

## 막힌 점
<!-- 미해결 이슈, 블로커 -->

## 내일 바로 할 일
<!-- 다음 세션 우선순위 작업 목록 -->

## 다음 프롬프트
<!-- 다음 에이전트 핸드오프용 프롬프트 — UI에서 복사 버튼으로 추출됨 -->
```

같은 날짜에 이미 파일이 있으면 기존 파일을 읽어서 내용을 합치거나 업데이트합니다.

### 5. regression_signal 계산

직전 harness-analysis 리포트 비교.

`.harness-lab/analysis/reports/` 에서 가장 최근 JSON 파일을 읽습니다.
파일이 있으면 `reject_rates` 필드를 이전 리포트(날짜순 2번째)와 비교합니다.

비교 규칙:
- 이전 리포트가 없으면 `regression_signal: null`
- `reject_rates`가 없는 리포트면 `regression_signal: null`
- 변화가 있으면 한 줄로 기록:
  - rate 감소 → `"code-reviewer reject: 50% → 25% (개선)"`
  - rate 증가 → `"security-guard reject: 0% → 33% (주의)"`
  - 변화 없음 → `null`

### 6. 블루프린트 저장

경로: `.harness-lab/blueprints/YYYY-MM-DD.json`

형식:
```json
{
  "date": "YYYY-MM-DD",
  "skills": [
    {
      "name": "tdd-guard-claude",
      "status": "DONE | TODO | IN_PROGRESS",
      "version": "v2.0.0",
      "role": "한 줄 역할 설명"
    }
  ],
  "coverage": {
    "current": 45,
    "description": "현재 커버리지 설명"
  },
  "pipeline": "tdd -> code-review -> git-guard",
  "session_summary": "이 세션의 한 줄 요약 (작업 요약과 동일하게)",
  "regression_signal": "code-reviewer reject: 50% → 25% (개선)"
}
```

- `skills` 배열의 각 항목은 프론트엔드의 `SkillStatusItem` 컴포넌트가 렌더링합니다.
- `coverage.current`는 프론트엔드의 `CoverageBar`와 `ProgressRing`에 표시됩니다.
- `pipeline`은 블루프린트 상세의 파이프라인 섹션에 표시됩니다.
- `regression_signal`이 "주의"이면 완료 보고 시 사용자에게 별도 언급합니다.
- 같은 날짜 파일이 이미 있으면 `session_summary`와 변경된 스킬 상태만 업데이트합니다.

### 7. skill-deps.json 갱신

로컬(`.claude/skills/`) 및 전역(`~/.claude/skills/`) SKILL.md 파일의 frontmatter에서 `depends_on` 필드를 읽어 의존성 그래프를 생성합니다.

```bash
node -e "
const fs = require('fs'), path = require('path'), os = require('os');

const skillDirs = [
  path.join(process.cwd(), '.claude/skills'),
  path.join(os.homedir(), '.claude/skills')
];

const graph = {};

for (const dir of skillDirs) {
  if (!fs.existsSync(dir)) continue;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const skillFile = path.join(dir, entry, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    const content = fs.readFileSync(skillFile, 'utf8');
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) continue;
    const fm = fmMatch[1];
    const deps = [];
    const depsBlock = fm.match(/depends_on:([\s\S]*?)(?=\n[a-z]|\$)/);
    if (depsBlock) {
      const skillMatches = depsBlock[1].matchAll(/skill:\s*[\"']?([^\"'\n]+)[\"']?/g);
      for (const m of skillMatches) deps.push(m[1].trim());
    }
    if (!graph[entry]) graph[entry] = deps;
  }
}

const out = {
  generated: new Date().toISOString().slice(0, 10),
  graph
};
const outPath = '.harness-lab/skill-deps.json';
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log('skill-deps.json 갱신 완료:', outPath);
"
```

생성 실패 시 에러만 출력하고 다음 단계로 진행합니다.

### 8. 원격 서버 동기화 (API)

로컬 파일 저장 후, 원격 서버에도 동기화합니다.
서버 URL은 환경변수 `VITE_API_URL` 또는 기본값 `https://skill-marketplace-umzq.onrender.com` 을 사용합니다.

> **주의: `curl` + `jq` 조합을 사용하지 말 것.**
> Windows 환경에서 `jq`가 설치되어 있지 않은 경우가 많아 실패합니다.
> 반드시 `node -e` 인라인 스크립트로 HTTP 요청을 보내세요.

**node 인라인 스크립트로 동기화:**
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
      res.on('end', () => { console.log(path, res.statusCode, buf); resolve(); });
    });
    req.on('error', e => { console.error(path, e.message); resolve(); });
    req.write(data);
    req.end();
  });
}

async function main() {
  const TODAY = new Date().toISOString().split('T')[0];
  const logContent = fs.readFileSync('.harness-lab/logs/' + TODAY + '.md', 'utf8');
  const blueprint = JSON.parse(fs.readFileSync('.harness-lab/blueprints/' + TODAY + '.json', 'utf8'));

  // 로그 동기화
  await post('/api/harness/logs', { date: TODAY, content: logContent });

  // 블루프린트 동기화 — 서버 API는 스킬별 entry 형식을 기대하므로 변환 후 전송
  // POST /api/harness/blueprints: { skill, date, change, reason, issues, articles }
  for (const skill of blueprint.skills) {
    await post('/api/harness/blueprints', {
      skill: skill.name,
      date: TODAY,
      change: skill.role + ' (status: ' + skill.status + ')',
      reason: blueprint.session_summary || '',
      issues: [],
      articles: []
    });
  }
}
main();
"
```

- 서버 응답이 실패해도 로컬 파일은 이미 저장되었으므로 에러만 보고하고 진행합니다.
- 성공 시 "원격 서버 동기화 완료"를 보고합니다.

### 9. 완료 보고

저장 완료 후 사용자에게 다음을 보고합니다:
- 일지 파일 경로
- 블루프린트 파일 경로
- 원격 동기화 결과 (성공/실패)
- 작업 요약 미리보기 (3줄 이내)
- Harness Lab 페이지에서 확인 가능하다는 안내
