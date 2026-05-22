# REQ-system-map-layer-context: 기능 지도에 DB·프론트 레이어 컨텍스트 연결

## Overview
`generate-system-map.js`에 `@table`, `@page` 주석 파싱을 추가하고, `schema.sql`과 `App.jsx`를 파싱해 DB 테이블 목록·프론트 페이지 목록을 수집한다. `/api/harness/system-map` 응답에 `db_tables`, `frontend_routes` 배열을 추가하고, 기능 지도 카드를 펼쳤을 때 해당 기능이 사용하는 테이블과 프론트 페이지를 표시한다. 새 팀원이 "이 기능은 어떤 DB 테이블을 쓰고 어떤 화면으로 이어지는가"를 코드를 읽지 않고 파악할 수 있게 한다.

## Background
현재 My System Structure 기능 지도는 백엔드 API 레퍼런스 수준에 그친다. 새 팀원이 `harness-log` 기능을 보면 라우트와 흐름은 알 수 있지만, "DB에서 어떤 테이블을 쓰는가", "어떤 프론트 화면과 연결되는가"는 여전히 코드를 직접 읽어야 한다. `@feature`처럼 코드에 직접 명시하는 방식으로 연결 정보를 추가하면 동기화를 코드 리뷰 단계에서 강제할 수 있다.

## Goals
- G-1: 기능 카드 펼침 시 사용 DB 테이블과 연결 프론트 페이지가 표시된다
- G-2: `schema.sql` 변경 시 `db_tables` 목록이 자동 반영된다
- G-3: `App.jsx` 라우터 변경 시 `frontend_routes` 목록이 자동 반영된다
- G-4: `@table`/`@page` 누락 라우트는 git-guard WARNING으로 감지된다

## Non-Goals
- NG-1: 이름 유사도 기반 자동 매핑 (오탐 위험으로 제외)
- NG-2: 테이블 컬럼 상세 표시 (이번 범위는 테이블 이름 목록만)
- NG-3: 프론트엔드 컴포넌트 트리 시각화

## Functional Requirements
- FR-1: `generate-system-map.js`가 라우트 주석에서 `// @table {테이블명[,테이블명]}` 파싱
- FR-2: `generate-system-map.js`가 라우트 주석에서 `// @page {경로[,경로]}` 파싱
- FR-3: `generate-system-map.js`가 `schema.sql`의 `CREATE TABLE` 패턴을 파싱해 `db_tables` 배열 생성
- FR-4: `generate-system-map.js`가 `App.jsx`의 `<Route path=` 패턴을 파싱해 `frontend_routes` 배열 생성
- FR-5: `/api/harness/system-map` 응답에 `db_tables`, `frontend_routes` 최상위 배열 추가
- FR-6: 각 feature 객체에 `tables: string[]`, `pages: string[]` 필드 추가
- FR-7: 기능 지도 카드 펼침 시 `tables`·`pages`가 있으면 표시, 없으면 미표시
- FR-8: `team.yml` git-guard 규칙에 `@table`/`@page` 누락 WARNING 추가

## Non-Functional Requirements
- NFR-1 (Maintainability): `@table`/`@page` 형식은 `@feature`와 동일한 패턴 — 파서 1곳만 수정
- NFR-2 (Backward compatibility): `@table`/`@page`가 없는 기존 라우트는 `tables: []`, `pages: []`로 처리
- NFR-3 (Parsability): `schema.sql`·`App.jsx` 파싱 실패 시 빈 배열 반환, 서버 에러 없음

## Acceptance Criteria
- [ ] AC-1: `// @table harness_logs,harness_blueprints` 주석이 있는 라우트의 feature 카드에 두 테이블이 표시된다
- [ ] AC-2: `// @page /lab` 주석이 있는 라우트의 feature 카드에 `/lab`이 표시된다
- [ ] AC-3: `@table`/`@page`가 없는 기존 라우트는 카드에 해당 섹션이 표시되지 않는다
- [ ] AC-4: `GET /api/harness/system-map` 응답에 `db_tables` 배열이 포함되고 `schema.sql` 테이블 이름 목록과 일치한다
- [ ] AC-5: `GET /api/harness/system-map` 응답에 `frontend_routes` 배열이 포함되고 `App.jsx` Route path 목록과 일치한다
- [ ] AC-6: `schema.sql`에 테이블을 추가하면 다음 `/system-map` 호출 시 `db_tables`에 반영된다
- [ ] AC-7: `@table`/`@page` 없는 `@feature` 라우트에 git-guard WARNING이 발생한다

## Technical Notes

### TD-1: @table/@page 주석 형식
- **결정**: `// @table {테이블명[,테이블명]}` / `// @page {경로[,경로]}` — 쉼표 구분 복수값 허용
- **이유**: `@feature`와 동일한 `// @key value` 패턴 유지. 파서 변경 최소화.
- **충돌 시 확인**: 테이블명·경로에 공백이 포함되면 파싱 오류 가능 — 현재 schema.sql/App.jsx 기준 공백 없음

### TD-2: db_tables 파싱 방식
- **결정**: `schema.sql`에서 `CREATE TABLE (IF NOT EXISTS)? (\w+)` 정규식으로 테이블명만 추출
- **이유**: 컬럼 상세는 이번 범위 밖. 테이블 이름만 있어도 "어떤 데이터를 다루는가" 파악 가능.
- **충돌 시 확인**: 마이그레이션용 `ALTER TABLE`은 파싱 대상 아님 — CREATE TABLE만 추출

### TD-3: frontend_routes 파싱 방식
- **결정**: `App.jsx`에서 `<Route path="([^"]+)"` 정규식으로 path 값만 추출
- **이유**: 컴포넌트 이름보다 path가 새 팀원에게 더 직접적.
- **충돌 시 확인**: 중첩 라우터가 생기면 App.jsx 외 파일도 파싱 필요 — 현재는 App.jsx 단일 파일

## Dependencies
- 선행 조건: REQ-feature-map-view 완료
- 연관 모듈: `scripts/generate-system-map.js`, `backend/src/routes/harness.js`, `frontend/src/pages/SystemStructurePage.jsx`, `git-guard-claude/references/team.yml`
- 관련 REQ: REQ-feature-map-view

## Open Questions
없음

## Definition of Done
- [ ] `generate-system-map.js`가 `@table`/`@page` 파싱 + `schema.sql`/`App.jsx` 파싱
- [ ] `/system-map` 응답에 `db_tables`, `frontend_routes`, feature별 `tables`/`pages` 포함
- [ ] SystemStructurePage 기능 카드 펼침 시 tables/pages 표시
- [ ] `team.yml` WARNING 규칙 추가
- [ ] 테스트 통과

## Features
| Feature | 파일 | 타입 |
|---------|------|------|
| system-map | [docs/features/system-map.md](../features/system-map.md) | 수정 |

## Metadata
- Author: 임은섭
- Created: 2026-05-21
- Status: DRAFT
- Related PR:
