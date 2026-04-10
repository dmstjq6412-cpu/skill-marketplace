---
name: harness-log
description: >
  Harness Lab 세션 일지 저장 스킬. 현재 대화 내용을 요약하여
  .harness-lab/logs/YYYY-MM-DD.md 에 저장하고,
  이 세션에서 작업한 스킬별 개선 이력(변경내역, 이유, 쟁점, 아티클)을
  .harness-lab/blueprints/YYYY-MM-DD-{skill}.json 에 저장합니다.
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

**결정한 것**: 이 세션에서 내린 설계/구현 결정 사항을 기록합니다. 반드시 **왜** 그 결정을 했는지 이유를 함께 적습니다. 나중에 맥락을 잃지 않도록 배경과 동기를 한 줄이라도 남깁니다.
예시: `- 블루프린트를 스킬별로 재설계 → 날짜 기준으론 스킬 발전 흐름을 추적하기 어려웠음`

**막힌 점**: 해결하지 못한 이슈, 블로커, 추가 조사가 필요한 항목을 기록합니다. 없으면 "없음"으로 기록합니다.

**내일 바로 할 일**: 다음 세션에서 바로 시작할 작업을 우선순위 순으로 나열합니다.

**다음 프롬프트**: 다음 세션의 Claude가 맥락을 바로 잡을 수 있도록 아래 3개 항목을 반드시 포함합니다. 프론트엔드의 "다음 에이전트 프롬프트 복사" 버튼이 이 섹션을 추출합니다.

- **지금 상태**: 현재 브랜치, 어디까지 완료됐는지 한 줄
- **다음 할 일**: 다음 세션에서 첫 번째로 실행할 구체적인 작업
- **열린 결정**: 아직 결정하지 못했거나 다음 세션에서 판단이 필요한 것

항목은 짧고 명확하게 유지합니다. compacting 이후에도 이 3개가 살아있어야 인수인계가 됩니다.

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
### 지금 상태
<!-- 현재 브랜치, 어디까지 완료됐는지 한 줄 -->

### 다음 할 일
<!-- 다음 세션에서 첫 번째로 실행할 구체적인 작업 -->

### 열린 결정
<!-- 아직 결정하지 못했거나 다음 세션에서 판단이 필요한 것 -->
```

같은 날짜에 이미 파일이 있으면 기존 파일을 읽어서 내용을 합치거나 업데이트합니다.

### 5. 블루프린트 저장 (스킬 개선 이력)

#### 5-1. git diff로 변경된 스킬 파일 탐지

아래 명령으로 이번 세션에서 실제로 변경된 스킬 파일을 확인합니다:

```bash
git diff HEAD --name-only
git diff HEAD --stat
```

`.claude/skills/` 경로 하위 파일이 변경되어 있으면 해당 스킬 디렉토리명을 대상으로 합니다.

예시:
```
.claude/skills/tdd-guard-claude/SKILL.md        → skill: "tdd-guard-claude"
.claude/skills/git-guard-claude/references/commit.md → skill: "git-guard-claude"
```

**대화 맥락만으로 판단하지 말고, git diff 결과를 우선 근거로 삼습니다.**
git diff에 스킬 파일 변경이 없더라도 대화에서 스킬 설계를 논의/결정했다면 entry를 작성합니다 (change에 "설계 논의" 명시).

#### 5-2. 스킬별 entry 작성

탐지된 스킬마다 아래 형식으로 entry를 작성합니다.
**작업하지 않은 스킬은 건너뜁니다.**

경로: `.harness-lab/blueprints/YYYY-MM-DD-{skill-name}.json`

```json
{
  "skill": "tdd-guard-claude",
  "date": "YYYY-MM-DD",
  "change": "이번 세션에서 이 스킬에 가한 변경 (한 줄, 구체적으로)",
  "reason": "변경한 이유 또는 동기 — 불편했던 점, 발견한 문제",
  "issues": ["고민했던 쟁점1", "트레이드오프2"],
  "articles": [
    { "title": "아티클 제목", "url": "https://..." }
  ]
}
```

- `change`: git diff의 실제 변경 내용을 근거로 한 줄로 요약
- `reason`: 대화에서 사용자가 언급한 동기나 문제 의식을 반영
- `issues`: 대화 중 논의된 쟁점, 트레이드오프, 결정하기 어려웠던 것들
- `articles`: 대화에서 언급된 링크/문서 (없으면 `[]`)
- 같은 날짜에 이미 파일이 있으면 덮어씁니다.

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
  const TODAY = 'YYYY-MM-DD'; // 실제 날짜로 치환
  const logContent = fs.readFileSync('.harness-lab/logs/' + TODAY + '.md', 'utf8');
  await post('/api/harness/logs', { date: TODAY, content: logContent });

  // 이 세션에서 작업한 스킬별 blueprint 동기화
  const blueprintFiles = fs.readdirSync('.harness-lab/blueprints/')
    .filter(f => f.startsWith(TODAY + '-') && f.endsWith('.json'));
  for (const file of blueprintFiles) {
    const entry = JSON.parse(fs.readFileSync('.harness-lab/blueprints/' + file, 'utf8'));
    await post('/api/harness/blueprints', entry);
  }
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
