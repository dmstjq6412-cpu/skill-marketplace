# REQ-feature-map-view: 시스템 기능 지도 뷰

## Overview
My System Structure 페이지에 기능 지도(Feature Map) 탭을 추가한다. 개발자가 라우트 파일에 `@feature`·`@desc`·`@flow`·`@req` 주석으로 기능 단위를 코드에 직접 명시하고, 이를 파싱해 "어떤 기능이 있고 어떤 흐름으로 동작하는가"를 시각화한다. 기존 API 목록 탭은 그대로 유지해 두 관점을 탭으로 전환한다.

## Background
현재 My System Structure 페이지는 라우트를 도메인별로 나열하는 Swagger 수준에 그친다. 바이브코딩으로 누적된 시스템에서 "이 기능이 왜 있고 어떤 흐름으로 동작하는가"를 코드를 직접 읽지 않고는 파악할 수 없다. 기능 단위와 흐름을 코드에 명시하면 시스템 구조 파악 비용을 낮추고 인지부채를 줄일 수 있다. REQ 파일이 있는 기능은 `@req` 주석으로 코드↔문서를 직접 연결한다.

## Goals
- G-1: 라우트 파일에 `@feature`·`@desc`·`@flow`·`@req` 주석으로 기능 단위를 명시하는 컨벤션 확립
- G-2: My System Structure 페이지에서 기능 지도 탭과 API 목록 탭을 전환할 수 있다
- G-3: 기능 지도에서 각 feature의 이름·설명·흐름·포함 라우트를 한눈에 파악할 수 있다
- G-4: REQ가 있는 feature는 코드 주석(`@req`)으로 직접 연결되어 코드↔문서 추적이 가능하다

## Non-Goals
- NG-1: 자동으로 기능을 추론하거나 AI로 설명을 생성하는 것 (코드 주석이 source of truth)
- NG-2: 프론트엔드 컴포넌트·훅에 대한 feature 주석 (이번 범위는 백엔드 라우트만)
- NG-3: feature 간 의존 관계 시각화

## Functional Requirements
- FR-1: 라우트 파일에 `// @feature {name}` / `// @desc {설명}` / `// @flow {흐름}` / `// @req {slug}` 주석 형식을 정의한다. `@feature`만 필수, 나머지는 선택.
- FR-2: `generate-system-map.js`가 위 주석을 파싱해 feature 단위로 라우트를 그룹핑한다
- FR-3: `GET /api/harness/system-map` 응답에 `features` 배열을 추가한다
- FR-4: My System Structure 페이지에 "기능 지도" / "API 목록" 탭 전환 UI를 추가한다
- FR-5: 기능 지도 탭에서 각 feature 카드는 name·desc·flow·포함 라우트 수를 표시한다
- FR-6: feature 카드를 펼치면 해당 feature에 속한 라우트 목록(method·path·auth)이 표시된다
- FR-7: `@req {slug}`가 명시된 feature는 REQ 뱃지를 표시하고, 클릭 시 해당 REQ 파일 경로를 표시한다
- FR-8: `@feature` 주석이 없는 라우트는 API 목록 탭에만 표시된다
- FR-9: `generate-system-map.js`가 라우트에 연결된 테스트 파일의 `describe`/`it` 블록을 파싱해 테스트 케이스 이름 목록을 추출한다
- FR-10: feature 카드를 펼쳤을 때 라우트 목록 아래에 해당 feature의 테스트 케이스 이름 목록이 표시된다

## Non-Functional Requirements
- NFR-1 (Maintainability): 주석 형식 변경 시 `generate-system-map.js`만 수정하면 된다
- NFR-2 (Consistency): `@feature` 이름이 같은 라우트는 같은 feature 카드로 자동 그룹핑된다
- NFR-3 (Backward compatibility): 기존 `domains` 배열은 API 응답에서 유지된다
- NFR-4 (Enforceability): 새 라우트 추가 시 `@feature` 누락은 git-guard WARNING으로 체크, CLAUDE.md에 작성 규칙 명시

## Acceptance Criteria
- [ ] AC-1: `@feature` 주석이 있는 라우트는 기능 지도 탭에 feature 카드로 그룹핑된다
- [ ] AC-2: 같은 `@feature` 이름을 가진 라우트들은 하나의 카드로 묶인다
- [ ] AC-3: 각 feature 카드에 name·desc·flow·포함 라우트 수가 표시된다
- [ ] AC-4: feature 카드를 펼치면 해당 라우트 목록(method·path·auth)이 표시된다
- [ ] AC-5: `@req {slug}`가 있는 feature는 REQ 뱃지가 표시된다
- [ ] AC-6: "API 목록" 탭은 기존 도메인별 라우트 테이블 동작을 유지한다
- [ ] AC-7: `GET /api/harness/system-map` 응답에 `features: [{ name, desc, flow, req_slug, routes, tests }]` 배열이 포함된다
- [ ] AC-8: `@feature` 주석이 없는 라우트는 API 목록 탭에만 나타나고 기능 지도 탭에는 표시되지 않는다
- [ ] AC-9: feature 카드 펼침 시 해당 feature에 속한 테스트 케이스 이름(`it(...)` 설명) 목록이 표시된다

## Technical Notes

### TD-1: @feature 주석 형식
- **결정**: 라우트 바로 위에 `// @feature {name}`, `// @desc {설명}`, `// @flow {흐름}`, `// @req {slug}` 주석. `@feature`만 필수, 나머지 선택. REQ가 있는 기능은 REQ의 Overview·FR을 요약해 `@desc`·`@flow`를 작성하고 `@req`로 직접 연결한다.
- **이유**: `@` prefix는 grep·편집기 하이라이팅이 쉽고, 4개 필드로 기능 이름·의도·흐름·문서 연결을 각각 분리해 구조화한다. REQ→코드 방향의 명시적 연결로 문서와 코드의 동기화 여부를 추적할 수 있다.
- **충돌 시 확인**: 필드 추가 필요 시 `generate-system-map.js` 파서만 수정하면 하위 호환 가능.

### TD-2: 두 탭 병존
- **결정**: "기능 지도" 탭과 "API 목록" 탭을 탭 UI로 병존. 기본 탭은 "기능 지도".
- **이유**: 기능 지도는 "무엇이 있는가" 파악용, API 목록은 "엔드포인트 상세" 확인용으로 목적이 다르다. 개발자는 두 관점이 모두 필요하다.
- **충돌 시 확인**: 기능 지도 커버리지가 낮아 대부분 라우트가 API 목록 탭에만 남으면 탭 전환 UX 재검토.

### TD-3: feature 그룹핑 단위
- **결정**: `@feature` 이름이 동일한 라우트를 하나의 feature로 묶는다. 라우트 파일(도메인)이 달라도 같은 이름이면 같은 feature로 집계된다.
- **이유**: feature는 도메인 경계가 아닌 기능 경계로 정의해야 한다. 하나의 기능이 여러 라우트 파일에 걸쳐 있을 수 있다.
- **충돌 시 확인**: 동명 feature가 의도치 않게 합쳐지면 도메인 prefix 추가 검토.

### TD-4: REQ 연결 방식 — 코드 주석 직접 명시
- **결정**: REQ↔feature 연결은 `@req {slug}` 주석으로 직접 명시한다. 키워드 자동 매칭(기존 TD-2)은 사용하지 않는다.
- **이유**: 키워드 자동 매칭은 오탐이 발생할 수 있고, "어떤 REQ를 구현하는가"는 개발자가 직접 선언해야 정확하다. REQ 파일을 참고해 `@desc`·`@flow`를 작성하고 `@req`로 연결하면 코드↔문서 추적이 명확해진다.
- **충돌 시 확인**: REQ slug가 변경되면 코드 주석도 함께 수정해야 한다. slug rename 시 grep으로 일괄 확인 필요.

### TD-5: @feature 주석 강제 수단
- **결정**: CLAUDE.md에 "백엔드 라우트 추가 시 `@feature` 주석 필수" 규칙 추가 + git-guard `coding_standards.md`에 WARNING 체크 추가.
- **이유**: CLAUDE.md로 Claude가 코드 작성 시 항상 주석을 붙이도록 보장하고, git-guard WARNING으로 사람이 직접 수정했을 때 catch한다. 두 레이어를 함께 적용해 누락을 방지한다.
- **충돌 시 확인**: WARNING이 너무 잦아 노이즈가 되면 REJECT 조건에서 제외하고 린트 규칙으로만 유지.

## Dependencies
- 선행 조건: REQ-system-map-view 완료 (My System Structure 페이지 존재)
- 연관 모듈: `scripts/generate-system-map.js`, `backend/src/routes/harness.js`, `frontend/src/pages/SystemStructurePage.jsx`, `~/.claude/skills/git-guard-claude/references/coding_standards.md`, `CLAUDE.md`
- 관련 REQ: REQ-system-map-view

## Open Questions
없음

## Definition of Done
- [ ] 백엔드 라우트 파일 전체에 `@feature`·`@desc`·`@flow`·`@req` 주석 추가
- [ ] `generate-system-map.js`가 `features` 배열을 포함한 JSON 반환
- [ ] SystemStructurePage에 탭 UI 구현, 기능 지도 탭 동작 확인
- [ ] 기존 API 목록 탭 회귀 없음
- [ ] CLAUDE.md에 @feature 주석 규칙 추가
- [ ] git-guard coding_standards.md에 WARNING 체크 추가
- [ ] 테스트 통과

## Metadata
- Author: 임은섭
- Created: 2026-05-21
- Status: DRAFT
- Related PR:
