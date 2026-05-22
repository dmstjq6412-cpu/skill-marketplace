---
name: project-guard
description: >
  운영 반영 전 코드 이해 합의를 강제하는 게이트 스킬.
  코드의 기능 흐름을 분석하여 Feature 파일의 Implementation Flow와 대조하고,
  불일치 시 합의를 강제하며 Feature 파일(Changelog/Flow/Decisions)을 자동 갱신한다.
version: 2.1.0
cost: medium
---

# project-guard — Feature 현재 상태 유지 게이트

## 존재 이유

바이브코딩으로 코드가 빠르게 쌓이면 Feature가 "왜 이렇게 구현됐는지"를 아는 사람이 사라진다.
요청자·개발자·유지보수 담당자 모두가 기능의 현재 상태와 변경 이력에 접근할 수 있으려면,
코드가 바뀔 때마다 Feature 파일이 함께 갱신되어야 한다.

project-guard는 이 갱신을 커밋 전에 강제하는 게이트다.

**단일 역할**
> 코드 기능 흐름 분석 → Feature Implementation Flow와 비교 → 불일치 시 합의 강제 → Feature 파일 갱신

---

## 파일 구조

```
docs/
  features/
    {slug}.md    ← project-guard가 관리하는 Feature 파일
  requirements/
    REQ-{slug}.md
```

**Feature 파일 구조 (`docs/features/{slug}.md`)**

```markdown
---
name: {slug}
status: active | wip | deprecated
created: {date}
last-modified: {date}
source-req: {REQ-slug}
---

## Overview
## Endpoints
## Implementation Flow   ← project-guard가 합의 후 갱신
## Connected
  - Tables:              ← project-guard가 자동 갱신
  - Pages:               ← project-guard가 자동 갱신
  - REQs:
## Decisions             ← FD-n, project-guard 합의 결과 기록
## Changelog             ← project-guard가 append
```

---

## 트리거 시점

### Primary — 커밋 시 (git-guard 연동)

staged 파일에 `backend/src/routes/*.js` 변경이 포함될 때 자동 실행.
코드가 확정된 이후이므로 분석 결과가 정확하다.

### Secondary — 명시적 호출

```
/project-guard scan   전체 Feature 현황 리포트
/project-guard fix    누락 어노테이션 라우트 일괄 보완
```

---

## 실행 절차

### Step 1: 변경 라우트 탐지 및 어노테이션 수집

```bash
git diff --staged --name-only | grep "^backend/src/routes/.*\.js$"
```

각 파일에서 추출:
```
@feature {slug}
@req     {REQ-slug}
@table   {table1},{table2}
@page    {/path}
```

- `@feature` 없는 라우트 → WARNING 출력, 해당 라우트 건너뜀
- 변경된 라우트 파일 없으면 즉시 PASS

---

### Step 2: Feature 파일 로드

각 `@feature` slug로 `docs/features/{slug}.md` 를 읽는다.

Feature 파일이 없으면:
- `@req` 가 있으면 → REQ 파일의 Implementation Flow를 초기값으로 Feature 파일 신규 생성 후 계속
- `@req` 도 없으면 → WARNING: "Feature 파일이 없습니다. req-guard를 먼저 실행하세요." 해당 라우트 건너뜀

---

### Step 3: 코드 정적 분석

각 라우트 핸들러에서 추출:

**미들웨어 체인**
```
router.get('/path', [middleware1, middleware2], handler)
```
- `authenticate` 등 인증 미들웨어 여부 및 순서

**핸들러 바디**
- SQL 패턴: `pool.query(...)` → `SELECT|INSERT|UPDATE|DELETE FROM (\w+)` → 실제 테이블명
- 외부 호출: `execSync`, `axios`, `fetch` 등
- 응답 방식: `res.json()`, `res.status().json()`

**비즈니스 수준 흐름 요약 생성**
```
POST /login: 인증 확인 → 자격 검증 → JWT 발급 → 응답
```

---

### Step 4: Feature Implementation Flow와 비교

Feature 파일의 `## Implementation Flow` vs Step 3 분석 결과 비교.

**비교 기준**
- 단계 수 차이 (±1 이상)
- 인증 여부 불일치 (Feature Flow에 "인증 확인"이 있는데 코드에 `authenticate` 없음)
- SQL 조작 불일치 (Feature Flow에 "DB 저장"인데 코드에 INSERT 없음)
- 핵심 비즈니스 단계 누락

일치 → Step 6 (@table/@page 자동 갱신만 수행) → PASS

**불일치 출력 형식**
```
⚠ Flow 불일치 — F-{slug} / POST /login
  Feature Flow : 인증 확인 → 입력 검증 → DB 저장 → 응답
  실제 코드    : 인증 확인 → DB 저장 → 응답
  차이         : "입력 검증" 단계 없음
```

---

### Step 5: 합의 프로세스 (불일치 시)

항목별로 개발자가 명시적으로 결정한다.

```
[합의 필요] F-{slug} / POST /login — "입력 검증" 단계 없음

  A. 코드가 맞다   — Feature Flow를 코드 기준으로 업데이트
  B. Flow가 맞다   — 코드에 해당 로직 추가 필요 (REJECT)
  C. 의도적 생략   — 이유를 한 줄로 입력해주세요

선택 (A/B/C):
```

모든 항목 합의 완료 → Step 6으로 진행.
B 선택 항목이 하나라도 있으면 → REJECT.

**합의 후 FD 문서화 프롬프트 (A 또는 C 선택 시)**

각 항목의 A/C 합의 직후 아래를 묻는다:

```
[FD 문서화] 이 결정을 Feature Decision으로 남길까요? (y/n)

  y 선택 시 추가 입력:
    충돌 시 확인 (선택, 엔터로 생략): [재검토가 필요한 조건]
```

FD로 남길 만한 경우:
- 이 방식이 "왜" 선택됐는지 나중에 설명이 필요한 경우
- 다른 방식도 고려됐지만 의도적으로 제외된 경우
- 성능·보안·유지보수 트레이드오프가 있는 경우

단순 오탈자 수정, 명명 변경 → FD 불필요.

---

### Step 6: Feature 파일 갱신

합의 결과를 `docs/features/{slug}.md` 에 반영한다.

**A 선택 (코드 기준으로 Flow 업데이트)**
- `## Implementation Flow` 해당 라인 업데이트
- `## Changelog` append:
  ```
  | {오늘 날짜} | Flow 변경: {변경 내용 한 줄} | {합의 시 입력한 이유} | {@req 값 또는 -} | A |
  ```

**C 선택 (의도적 생략)**
- `## Implementation Flow` 해당 단계에 `(생략: {이유})` 표시
- `## Changelog` append:
  ```
  | {오늘 날짜} | {단계} 의도적 생략 | {이유} | {@req 값 또는 -} | C |
  ```

**FD-n 생성 (Step 5에서 y 선택 시)**

`## Decisions` 섹션 마지막 FD 번호 +1로 추가:

```markdown
### FD-{n}: {합의 내용 한 줄 제목}
- **현재 결정**: {코드 상태 설명}
- **이유**: {Step 5 합의 시 입력한 이유}
- **출처**: {오늘 날짜} 커밋 합의 ({A/C})
- **충돌 시 확인**: {입력한 재검토 조건 — 없으면 이 줄 생략}
```

`## Changelog`에도 FD 생성 사실을 함께 기록:

```
| {날짜} | FD-{n} 추가: {결정 제목} | {이유} | {@req 값 또는 -} | FD |
```

---

**@table 불일치 자동 갱신**
- 코드 SQL grep 결과 vs `@table` 선언 비교
- 불일치 시 Feature 파일 `## Connected > Tables` 자동 업데이트
- 코드 `@table` 어노테이션도 함께 업데이트

**@page 불일치 자동 갱신**
- App.jsx Route 파싱 vs `@page` 선언 비교
- 불일치 시 Feature 파일 `## Connected > Pages` 자동 업데이트

**Feature status 갱신**
- 처음 합의 완료 시: `status: wip → active`
- `last-modified` 오늘 날짜로 갱신

---

### Step 7: 판정 출력

```
VERDICT: PASS

✅ project-guard 완료

Feature 파일 갱신:
- docs/features/auth-login.md
  - Changelog 1건 추가 (A: 입력 검증 단계 제거)
  - Tables 갱신: users 추가
```

```
VERDICT: REJECT

🚫 B 선택 항목이 있습니다. 코드를 수정한 후 다시 커밋해주세요.

- F-auth-login / POST /login: 입력 검증 로직 추가 필요
```

---

## git-guard 연동

`backend/src/routes/*.js` 파일이 staged에 포함되면 커밋 전 자동 실행.
REJECT 시 커밋 차단. PASS 시 커밋 진행.

---

## trace 저장

판정 출력 후 실행 결과를 저장한다.

```bash
node -e "
const fs = require('fs'), path = require('path'), cp = require('child_process');
const tracesDir = '.harness-lab/traces';
if (!fs.existsSync(tracesDir)) fs.mkdirSync(tracesDir, { recursive: true });
const branch = cp.execSync('git branch --show-current').toString().trim() || 'unknown';
const now = new Date();
const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
const rand = Math.random().toString(36).slice(2, 6);
const trace = {
  skill: 'project-guard',
  date: now.toISOString().slice(0, 10),
  branch: branch,
  verdict: <VERDICT>,
  features_checked: <FEATURES_JSON>,
  issues: <ISSUES_JSON>
};
fs.writeFileSync(path.join(tracesDir, ts + '-project-guard-' + rand + '.json'), JSON.stringify(trace, null, 2));
console.log('trace saved');
"
```
