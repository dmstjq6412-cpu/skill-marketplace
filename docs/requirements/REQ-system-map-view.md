# REQ-system-map-view: 시스템 맵 뷰

## Overview
바이브코딩으로 빠르게 쌓인 코드베이스에서 "무엇이 있고 왜 존재하는가"를 코드를 직접 읽지 않고도 파악할 수 있는 뷰. API 엔드포인트·프론트엔드 컴포넌트·테스트를 한 화면에서 보여주고, 각 기능의 존재 이유(REQ 문서 연결)까지 표시한다.

## Background
바이브코딩은 빠르게 코드를 쌓지만, 시간이 지나면 "이 API가 왜 있는지", "이 로직의 의도가 뭔지"를 추적하기 어려워진다. 현재는 코드를 직접 열어봐야만 알 수 있고, 코드베이스 전체를 머릿속에 담아야 한다. `generate-system-map.js`와 `system-map.md`가 이미 구조 추출은 하고 있지만, UI가 없고 "왜"에 해당하는 맥락이 없다.

## Goals
- G-1: API 엔드포인트 목록을 코드 없이 한 화면에서 볼 수 있다
- G-2: 각 기능의 존재 이유(intent)를 REQ 문서와 연결해 표시한다
- G-3: 연관 테스트 파일을 함께 표시해 커버리지 현황을 파악할 수 있다

## Non-Goals
- NG-1: 실시간 코드 분석 (빌드 타임 또는 수동 갱신으로 충분)
- NG-2: 인터랙티브 코드 편집
- NG-3: 의존 관계 그래프/다이어그램 (1단계에서는 테이블로 충분)

## Functional Requirements
- FR-1: Harness Lab과 동급의 별도 시스템 탭 추가, 탭 이름: "My System Structure"
- FR-2: API 엔드포인트를 도메인(auth / skills / harness)별로 그룹화해 표시
- FR-3: 각 엔드포인트에 Method, Path, 설명, 인증 여부, 연관 테스트 표시
- FR-4: REQ 문서(`docs/requirements/REQ-*.md`)가 존재하면 해당 기능 옆에 뱃지 표시
- FR-5: `generate-system-map.js`를 JSON 출력으로 확장해 프론트엔드가 소비할 수 있게 함
- FR-6: 백엔드에 `GET /api/harness/system-map` 엔드포인트 추가

## Non-Functional Requirements
- NFR-1 (Performance): 페이지 로드 시 3초 이내 표시
- NFR-2 (Maintainability): 라우트 파일에 새 엔드포인트 추가 시 자동으로 시스템 맵에 반영
- NFR-3 (Maintainability): 새 REQ 문서 추가 시 연결이 자동으로 업데이트됨

## Acceptance Criteria
- [ ] AC-1: 네비게이션에서 "My System Structure" 탭 클릭 시 별도 페이지로 이동하고 API 목록이 도메인별로 표시된다
- [ ] AC-2: 각 행에 Method(색상 구분), Path, 설명, 인증 여부(🔒/🔓), 연관 테스트가 표시된다
- [ ] AC-3: REQ 문서가 연결된 기능은 뱃지가 표시된다
- [ ] AC-4: REQ 문서가 없는 기능은 회색 "REQ 없음" 상태로 표시된다
- [ ] AC-5: `generate-system-map.js`가 `--json` 플래그로 JSON 출력이 가능하다
- [ ] AC-6: `GET /api/harness/system-map` 호출 시 구조화된 JSON을 반환한다

## Technical Notes

### TD-1: API 응답 JSON 스키마
- **결정**: `GET /api/harness/system-map` 응답 스키마는 아래로 확정한다.
  ```json
  {
    "generated_at": "2026-05-21",
    "domains": [
      {
        "name": "harness",
        "routes": [
          {
            "method": "GET",
            "path": "/evaluations/:id",
            "description": "라우트 위 주석, 없으면 빈 문자열",
            "auth": true,
            "logic": "harness.js:279",
            "client_fn": { "name": "fetchAllHarnessEvaluations", "line": 59 },
            "test_file": "backend/tests/routes/harness.test.js",
            "req_slug": "system-map-view"
          }
        ]
      }
    ]
  }
  ```
  - `client_fn`: 매핑되는 client.js 함수가 없으면 `null`
  - `test_file`: 테스트 파일이 없으면 `null`
  - `req_slug`: 연결된 REQ slug, 없으면 `null`
  - 연관 UI 컴포넌트는 포함하지 않는다 (하드코딩으로 부정확하므로 제외)
- **이유**: 프론트엔드-백엔드 계약을 REQ 단계에서 확정해 구현 중 스키마 변경으로 인한 재작업을 방지한다.
- **충돌 시 확인**: 필드 추가가 필요하면 기존 필드를 수정하지 않고 추가만 한다 (하위 호환).

### TD-2: REQ 뱃지 연결 단위 — 도메인 레벨
- **결정**: REQ ↔ 라우트 연결은 **도메인(파일) 단위**로 한다. `REQ-{slug}.md`의 slug에 도메인명(auth/skills/harness)이 포함되면 해당 도메인의 모든 라우트에 REQ 뱃지를 표시한다.
- **이유**: 엔드포인트 단위 연결은 라우트 파일에 어노테이션이 필요해 유지보수 부담이 생긴다. 도메인 단위는 파일명 매칭만으로 가능하다.
- **충돌 시 확인**: 하나의 도메인에 REQ가 여러 개 붙거나 특정 엔드포인트만 연결해야 하는 경우가 생기면 엔드포인트 단위 어노테이션 방식으로 전환을 검토한다.

### TD-3: 설명 없는 엔드포인트 처리
- **결정**: 라우트 위 주석이 없으면 `description`을 빈 문자열로 반환한다. UI에서는 `"—"`으로 표시한다.
- **이유**: null 처리보다 빈 문자열이 프론트엔드 렌더링에서 분기를 줄인다.
- **충돌 시 확인**: 설명 없는 엔드포인트가 많아 시스템 맵 가독성이 떨어지면 주석 작성을 강제하는 lint 규칙 추가를 검토한다.

### TD-4: system-map 데이터 런타임 생성
- **결정**: API 호출 시 `generate-system-map.js`를 실행해 그 결과를 반환한다. 사전 생성 파일(git 커밋)을 사용하지 않는다.
- **이유**: 기존 `system-map.md`가 2026-04-24 이후 갱신되지 않아 신규 API(`evaluations`, `references` 등)가 누락된 선례가 있다. 수동 갱신에 의존하면 시스템 맵이 낡아 신뢰할 수 없게 된다. 이 프로젝트 규모에서 파싱 비용은 무시할 수준이다.
- **충돌 시 확인**: 응답이 느리다는 피드백이 오면 이 결정을 재검토한다. 그때는 캐시(메모리 or Redis) 레이어를 추가하되, git 커밋 방식으로 되돌아가지 않는다.

### TD-2: REQ 문서 ↔ 라우트 파일 매핑 규칙
- **결정**: `REQ-{slug}.md`의 slug에 라우트 파일명(auth/skills/harness)이 포함되면 해당 도메인에 연결한다. (예: `REQ-system-map-view.md` → `harness.js` 도메인)
- **이유**: 코드 내 어노테이션 없이 파일명만으로 연결할 수 있어 유지보수 부담이 없다.
- **충돌 시 확인**: 하나의 REQ가 여러 라우트에 걸치는 경우가 생기면 REQ 파일 내 `## Dependencies` 섹션의 연관 모듈 필드를 활용하는 방식으로 확장한다.

### TD-3: 백엔드가 스크립트를 직접 실행
- **결정**: `GET /api/harness/system-map` 핸들러가 `child_process.execSync`로 `generate-system-map.js --json`을 실행한다.
- **이유**: 스크립트 로직을 백엔드 코드에 복사하지 않아 단일 진실 소스를 유지한다.
- **충돌 시 확인**: 배포 환경에서 Node 스크립트 실행 권한 문제가 생기면 스크립트 로직을 라이브러리 함수로 분리해 직접 import하는 방식으로 전환한다.

## Dependencies
- 선행 조건: 없음 (`generate-system-map.js` 이미 존재)
- 연관 모듈: `scripts/generate-system-map.js`, `backend/src/routes/harness.js`, `frontend/src/App.jsx` (라우트 추가), 신규 `frontend/src/pages/SystemStructurePage.jsx`
- 관련 REQ: 이 REQ 문서 자체가 req-guard 첫 실전 사례

### TD-5: 페이지 위치 — HarnessLabPage 탭이 아닌 별도 시스템 탭
- **결정**: Harness Lab과 동급의 독립 페이지(`/system-structure`)로 만든다. 탭 이름은 "My System Structure". `App.jsx`에 라우트 추가, 신규 `SystemStructurePage.jsx` 생성.
- **이유**: 시스템 구조 파악은 Harness 운영과 목적이 다르다. 같은 페이지 안에 넣으면 Harness Lab이 비대해지고 두 관심사가 섞인다.
- **충돌 시 확인**: 페이지가 너무 많아 네비게이션이 복잡해지면 통합을 재검토한다.

## Open Questions
- OQ-1 (해소): ~~system-map.json을 git에 커밋할 것인가, 런타임 생성인가~~ → **런타임 생성으로 결정** (TD-1 참조)
- OQ-2 (해소): ~~REQ-slug ↔ 라우트 파일명 매핑 규칙~~ → **slug에 라우트명 포함 여부로 매핑** (TD-2 참조)

## Definition of Done
- [ ] `GET /api/harness/system-map` 동작
- [ ] HarnessLabPage 시스템 맵 탭 렌더링
- [ ] REQ 뱃지 표시 (있음/없음 구분)
- [ ] 기존 테스트 회귀 없음

## Features
| Feature | 파일 | 타입 |
|---------|------|------|
| system-map | [docs/features/system-map.md](../features/system-map.md) | 신규 |

## Metadata
- Author: 임은섭
- Created: 2026-05-21
- Status: DRAFT
- Related PR:
