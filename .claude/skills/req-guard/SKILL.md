---
name: req-guard
description: >
  피쳐 개발 전 Requirements 문서를 먼저 작성하는 스킬.
  사용자의 기능 요청을 받아 production-grade 명세서를 초안으로 생성하고
  사용자 확인 후 docs/requirements/REQ-{slug}.md 에 저장합니다.
  bugfix/hotfix를 제외한 모든 피쳐 개발 전에 실행합니다.
version: 1.1.0
cost: light
---

# req-guard — Requirements 문서 먼저 작성

이 스킬이 호출되면 사용자의 피쳐 요청을 분석하여 Requirements 문서 초안을 생성하고,
사용자 확인 후 `docs/requirements/REQ-{slug}.md` 에 저장합니다.

## 존재 이유

바이브코딩 과정에서 명확한 개발 문서 없이 표류하는 것을 막고,
해당 스펙에 대한 인지부채를 줄이며, "왜 이 코드가 있는가"의 맥락을 문서로 남긴다.

## 적용 대상

아래 중 하나라도 해당하면 req-guard를 실행한다:
- 새 컴포넌트 / 페이지 / 화면 생성
- 새 API 엔드포인트 추가
- 기존 로직의 의미 있는 변경 또는 리팩토링
- 새 스킬 / 훅 / 설정 구조 도입

**제외 (req-guard 불필요):**
- bugfix / hotfix
- CSS·스타일 변경만 있는 경우
- 설정 파일·의존성 업데이트

---

## 실행 절차

### 1. 요청 분석 및 Break-down

사용자의 자연어 요청을 읽고 아래를 파악한다:
- 무엇을 만들거나 바꾸려는가
- 왜 필요한가 (명시된 경우)
- 어떤 범위인가 (단일 컴포넌트 vs 여러 레이어)

적용 대상이 아니면 (bugfix, CSS 수정 등):
> "req-guard 적용 대상이 아닙니다. tdd-guard-claude로 바로 진행하세요."
를 출력하고 종료한다.

#### 요청이 두루뭉실한 경우 — Break-down 먼저

요청이 주제 수준에 머물러 있어 바로 Requirements 초안을 쓸 수 없다고 판단되면,
초안 작성 전에 break-down 과정을 거친다.

**두루뭉실한 요청의 기준:**
- "X를 만들어줘" 수준이고 무엇이 불편한지 명시되지 않은 경우
- 범위가 너무 넓어 AC를 테스트 가능한 수준으로 쓸 수 없는 경우
- 같은 주제로 여러 가지 해석이 가능한 경우

**Break-down 절차:**
1. 현재 코드베이스에서 관련 파일·기능을 파악한다 (Glob, Grep, Read 활용)
2. 사용자가 느끼는 **실제 불편함**이 무엇인지 확인한다
3. 가능한 구현 옵션을 심플한 것부터 제시하고 방향을 합의한다
4. 합의된 방향을 기반으로 Blocking 질문 단계로 넘어간다

Break-down 없이 바로 초안을 쓸 수 있을 만큼 요청이 구체적이면 이 단계를 건너뛴다.

### 2. 애매함 분류 — Blocking vs Important

요청을 분석해 불명확한 부분을 두 등급으로 분류한다.

#### Blocking (초안 전에 반드시 확인)
초안의 방향 자체가 달라질 수 있는 것. **최대 3개**까지만 추린다.

Blocking에 해당하는 예:
- Actor가 불분명할 때
  > "이 기능의 주 사용자가 누구인가요? (관리자 전용 / 일반 사용자 / 둘 다)"
- 기존 기능 확장인지 새 기능인지 불분명할 때
  > "기존 X 기능을 확장하는 건가요, 완전히 새로운 흐름인가요?"
- 핵심 범위가 열려 있을 때
  > "A만 처리하면 되나요, B·C도 이번에 포함인가요?"

Blocking 질문이 없으면 이 단계를 건너뛰고 바로 초안 작성으로 넘어간다.

#### Important (초안 안에 `[미정]` 표시 후 확인 단계에서 해소)
세부 결정사항이나 edge case처럼 초안을 쓸 수 있지만 나중에 채워야 하는 것.

Important에 해당하는 예:
- 실패·오류 처리 방식 (에러 표시 / 무시 / 재시도)
- 성능 목표 수치
- 권한·인증 필요 여부
- 특정 edge case 처리 여부

### 3. Blocking 질문 (해당할 때만)

Blocking 항목이 있으면 초안 작성 전에 사용자에게 질문한다.

출력 형식:
```
초안을 작성하기 전에 범위에 영향을 주는 부분을 먼저 확인할게요.

1. {질문}
2. {질문}
```

답변을 받으면 slug 결정 및 초안 작성으로 넘어간다.

### 4. slug 결정

피쳐 이름에서 kebab-case slug를 만든다.

규칙:
- 영문 소문자 + 하이픈만 사용
- 기능을 한눈에 알 수 있는 단어 조합 (3~5 단어)
- 예: `req-guard-skill`, `harness-compare-view`, `user-auth-jwt`

파일 경로: `docs/requirements/REQ-{slug}.md`

이미 같은 slug 파일이 존재하면 사용자에게 알리고
- 기존 파일을 업데이트할지
- 새 slug로 생성할지
선택하도록 한다.

### 5. Requirements 문서 초안 생성

아래 템플릿을 채워 초안을 작성한다.
Important 항목 중 아직 답이 없는 것은 `[미정 — 확인 필요]` 로 표시하고
`## Open Questions` 에도 동일하게 기재한다.

```markdown
# REQ-{slug}: {피쳐 이름}

## Overview
무엇을, 왜 만드는가. 한 문단으로 요약.

## Background
이 피쳐가 필요한 배경과 해결하려는 문제.
현재 어떤 불편함이나 공백이 있는가.

## Goals
이 요구사항이 달성해야 할 목표. 가능하면 측정 가능하게 기술한다.
- G-1:
- G-2:

## Non-Goals
이번 범위에서 명시적으로 제외하는 것.
- NG-1:

## Functional Requirements
- FR-1:
- FR-2:

## Non-Functional Requirements
- NFR-1 (Performance):
- NFR-2 (Security):
- NFR-3 (Maintainability):

## Implementation Flow
REQ 확정 시점의 원본 의도. 이 문서가 저장된 후 변경되지 않는다.
Feature 파일의 Implementation Flow가 현재 상태를 반영한다.

형식: `{METHOD} {path}: {단계} → {단계} → ...`
단계는 비즈니스 수준으로 기술한다 (코드 라인이 아닌 의미 단위).

- {METHOD} {path}: {단계} → {단계} → 응답

## Acceptance Criteria
완료 판단의 기준. 테스트 가능한 조건으로 기술한다.
- [ ] AC-1:
- [ ] AC-2:

## Technical Notes

기술적·시스템적으로 중요한 결정은 아래 형식으로 기록한다.
나중에 같은 주제로 충돌이 생겼을 때 "왜 그렇게 결정했는지" 확인할 수 있어야 한다.

### TD-1: {결정 제목}
- **결정**: 무엇을 선택했는가
- **이유**: 왜 이 선택을 했는가 (대안 대비 근거)
- **충돌 시 확인**: 이 결정을 재검토해야 하는 조건이나 신호

## Dependencies
- 선행 조건 (먼저 완료되어야 하는 것):
- 연관 모듈 / 스킬:
- 관련 REQ:

## Open Questions
개발 전·중에 확인이 필요한 미결 사항.
- OQ-1:

## Definition of Done
"완료"의 명확한 기준.
- [ ]
- [ ]

## Features
req-guard Feature decomposition 결과. Step 7.6에서 자동 생성됨.

| Feature | 파일 | 타입 |
|---------|------|------|

## Metadata
- Author: 임은섭
- Created: {오늘 날짜}
- Status: DRAFT
- Related PR:
```

### 6. 사용자 확인

초안을 출력한 뒤 아래 메시지를 표시한다:

```
---
[미정] 항목이 있으면 함께 표시한다:
  • [미정] NFR-1 (Performance): 목표 응답시간이 있으신가요?
  • [미정] OQ-1: 실패 시 재시도 처리가 필요한가요?

위 내용으로 docs/requirements/REQ-{slug}.md 를 저장합니다.
[미정] 항목에 답변하시거나, 그대로 진행하시면 됩니다.
```

사용자가 [미정] 항목에 답변하면 해당 항목을 채워 넣는다.
수정을 요청하면 해당 항목만 반영한 뒤 다시 확인을 구한다.

### 7. 파일 저장

확인이 완료되면:

1. `docs/requirements/` 디렉토리가 없으면 생성한다.
2. `docs/requirements/REQ-{slug}.md` 로 저장한다.

### 7.5. Feature 파일 관리

REQ 파일 저장 후 Feature decomposition을 수행하고 `docs/features/` 파일을 관리한다.

#### 7.5.1 Feature decomposition

REQ의 FR과 Implementation Flow를 분석해 독립적으로 구현 가능한 Feature 단위로 분해한다.

각 Feature 항목:
- slug: kebab-case 3~4 단어
- 담당 엔드포인트 목록
- 연결 AC 번호
- Implementation Flow 요약 (REQ Implementation Flow에서 해당 부분 추출)

분해 결과를 사용자에게 먼저 보여주고 확인을 받는다:
```
Feature decomposition 결과:

F-1: {slug}
  엔드포인트: {METHOD} /path, ...
  연결 AC: AC-1, AC-2

F-2: {slug}
  엔드포인트: {METHOD} /path
  연결 AC: AC-3

위 분해로 진행할까요? 조정이 필요하면 말씀해주세요.
```

#### 7.5.2 기존 Feature 충돌 검사

각 Feature slug에 대해 `docs/features/{slug}.md` 파일이 있는지 확인한다.

파일이 있으면 `## Decisions` 섹션을 읽어 현재 REQ 의도와 충돌하는 FD가 있는지 검사한다.

충돌 발견 시 REQ 작성을 계속하기 전에 사용자에게 알린다:
```
⚠ 결정 충돌 — {Feature slug} / {FD-n}: {결정 제목}

  기존 결정: {내용} ({출처 REQ}, {날짜}, {이유})
  현재 요청: {새 방향}

  A. 새 결정으로 대체 (개발 후 project-guard가 FD 갱신)
  B. 두 요구사항 조율 필요 → REQ 범위 재논의
```

#### 7.5.3 Feature 파일 생성/업데이트

사용자 확인 후 각 Feature에 대해:

**신규 Feature** (`docs/features/{slug}.md` 없음):
`docs/features/{slug}.md` 를 아래 템플릿으로 생성한다.

```markdown
---
name: {slug}
status: wip
created: {오늘 날짜}
last-modified: {오늘 날짜}
source-req: {REQ-slug}
---

# F: {feature 이름}

## Overview
{FR에서 추출한 한 줄 설명}

## Endpoints
{담당 엔드포인트 목록}

## Implementation Flow
{REQ Implementation Flow에서 해당 Feature 부분 추출. project-guard가 이후 갱신.}

## Connected
- Tables: (project-guard가 채움)
- Pages: (project-guard가 채움)
- REQs: {REQ-slug}

## Decisions
(FD-n 항목. project-guard 합의 결과 또는 REQ Technical Notes에서 해당 Feature 관련 TD 변환)

## Changelog
| 날짜 | 변경 내용 | 이유 | REQ | 타입 |
|------|---------|------|-----|------|
| {오늘 날짜} | 최초 생성 | | {REQ-slug} | 신규 |
```

**기존 Feature** (파일 있음):
- `## Connected > REQs` 에 현재 REQ-slug 추가
- Changelog 갱신은 project-guard 담당 — req-guard는 건드리지 않음

#### 7.5.4 REQ ## Features 섹션 업데이트

REQ 파일의 `## Features` 섹션을 decomposition 결과로 채운다:

```markdown
## Features
| Feature | 파일 | 타입 |
|---------|------|------|
| {slug} | [docs/features/{slug}.md](../features/{slug}.md) | 신규\|수정 |
```

---

### 7.6. 기술 결정사항 아카이브

REQ 문서의 `## Technical Notes` 섹션에 `TD-` 항목이 하나 이상 존재하면,
각 항목을 `docs/decisions/log.md` 에 추가로 기록한다.

**절차:**
1. `docs/decisions/` 디렉토리가 없으면 생성한다.
2. `docs/decisions/log.md` 가 없으면 헤더와 함께 신규 생성한다:
   ```markdown
   # Decision Log
   > 기술적·시스템적으로 중요한 결정을 시간순으로 기록합니다.
   > 각 결정은 REQ 문서의 Technical Notes에서 추출됩니다.
   ```
3. 파일 끝에 아래 형식으로 각 TD 항목을 추가한다 (기존 내용 수정 금지, append only):
   ```markdown
   ---
   ## {날짜} | {REQ-slug} | TD-{n}: {결정 제목}
   - **결정**: ...
   - **이유**: ...
   - **충돌 시 확인**: ...
   ```

TD 항목이 없으면 이 단계를 건너뛴다.

### 8. 완료 보고

```
Requirements 문서 저장 완료: docs/requirements/REQ-{slug}.md
{Feature 신규}: Feature 파일 {n}개 생성 → docs/features/
{Feature 수정}: 기존 Feature {n}개 REQ 연결 추가
{충돌 해소}: 결정 충돌 {n}건 → 사용자 확인 완료
{TD 항목이 있으면}: 기술 결정사항 {n}건 → docs/decisions/log.md 에 추가됨

다음 단계: tdd-guard-claude를 실행하여 이 spec을 기반으로 테스트를 먼저 작성하세요.
tdd-guard-claude는 REQ의 AC와 Feature Implementation Flow를 참고하여 테스트를 작성합니다.
```
