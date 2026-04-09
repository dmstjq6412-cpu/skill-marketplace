---
name: harness-log
description: >
  Harness Lab 세션 일지 저장 스킬. 현재 대화 내용을 요약하여
  .harness-lab/logs/YYYY-MM-DD.md 에 저장하고,
  블루프린트 스냅샷을 .harness-lab/blueprints/YYYY-MM-DD.json 에 저장합니다.
  HarnessLabPage UI의 핸드오프 흐름과 동기화된 섹션 구조를 사용합니다.
version: 2.0.0
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

**스킬 변경 파일**: 이 세션에서 수정하거나 신규 생성한 스킬 관련 파일 목록입니다. 파일 경로와 변경 내용 한 줄을 함께 기록합니다. 다음 세션에서 harness-resume이 이 섹션을 읽어 "어떤 스킬 파일을 먼저 읽어야 하는지" 안내하는 데 사용합니다.

형식:
```
- `경로` — 변경 내용 한 줄
```

변경한 파일이 없으면 "없음"으로 기록합니다.

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

## 스킬 변경 파일
<!-- 이 세션에서 수정/생성한 스킬 관련 파일 — 경로 + 변경 내용 한 줄 -->

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

### 5. 블루프린트 스냅샷 저장

프로젝트의 `.claude/skills/` 디렉토리를 읽어 현재 스킬 상태를 JSON으로 추출합니다.

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
  "session_summary": "이 세션의 한 줄 요약 (작업 요약과 동일하게)"
}
```

- `skills` 배열의 각 항목은 프론트엔드의 `SkillStatusItem` 컴포넌트가 렌더링합니다.
- `coverage.current`는 프론트엔드의 `CoverageBar`와 `ProgressRing`에 표시됩니다.
- `pipeline`은 블루프린트 상세의 파이프라인 섹션에 표시됩니다.
- 같은 날짜 파일이 이미 있으면 `session_summary`와 변경된 스킬 상태만 업데이트합니다.

### 6. 원격 서버 동기화 (API)

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
  return new Promise((resolve, reject) => {
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
  const logContent = fs.readFileSync('.harness-lab/logs/YYYY-MM-DD.md', 'utf8');
  const blueprint = JSON.parse(fs.readFileSync('.harness-lab/blueprints/YYYY-MM-DD.json', 'utf8'));
  await post('/api/harness/logs', { date: 'YYYY-MM-DD', content: logContent });
  await post('/api/harness/blueprints', blueprint);
}
main();
"
```

- `YYYY-MM-DD`는 실제 날짜로 치환합니다.
- 서버 응답이 실패해도 로컬 파일은 이미 저장되었으므로 에러만 보고하고 진행합니다.
- 성공 시 "원격 서버 동기화 완료"를 보고합니다.

### 7. 완료 보고

저장 완료 후 사용자에게 다음을 보고합니다:
- 일지 파일 경로
- 블루프린트 파일 경로
- 원격 동기화 결과 (성공/실패)
- 작업 요약 미리보기 (3줄 이내)
- Harness Lab 페이지에서 확인 가능하다는 안내
