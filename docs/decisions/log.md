# Decision Log
> 기술적·시스템적으로 중요한 결정을 시간순으로 기록합니다.
> 각 결정은 REQ 문서의 Technical Notes에서 추출됩니다.

---
## 2026-05-21 | REQ-system-map-view | TD-1: API 응답 JSON 스키마 확정
- **결정**: `GET /api/harness/system-map` 응답은 `{ generated_at, domains: [{ name, routes: [{ method, path, description, auth, logic, client_fn, test_file, req_slug }] }] }` 형태. 연관 UI 컴포넌트는 제외. client_fn/test_file/req_slug 없으면 null.
- **이유**: 프론트-백 계약을 REQ 단계에서 확정해 구현 중 스키마 변경으로 인한 재작업을 방지한다.
- **충돌 시 확인**: 필드 추가 필요 시 기존 필드 수정 없이 추가만 한다 (하위 호환).

---
## 2026-05-21 | REQ-system-map-view | TD-2: REQ 뱃지 연결 단위 — 도메인 레벨
- **결정**: REQ ↔ 라우트 연결은 도메인(파일) 단위. slug에 도메인명(auth/skills/harness)이 포함되면 해당 도메인의 모든 라우트에 뱃지 표시.
- **이유**: 엔드포인트 단위 연결은 라우트 파일 어노테이션이 필요해 유지보수 부담이 생긴다.
- **충돌 시 확인**: 특정 엔드포인트만 연결해야 하는 경우가 생기면 엔드포인트 단위 어노테이션 방식으로 전환 검토.

---
## 2026-05-21 | REQ-system-map-view | TD-3: 설명 없는 엔드포인트 처리
- **결정**: 주석 없으면 description 빈 문자열. UI에서 "—"으로 표시.
- **이유**: null보다 빈 문자열이 프론트엔드 렌더링 분기를 줄인다.
- **충돌 시 확인**: 설명 없는 엔드포인트가 많아 가독성이 떨어지면 주석 작성 강제 lint 규칙 추가 검토.

---
## 2026-05-21 | REQ-system-map-view | TD-5: 페이지 위치 — 별도 시스템 탭
- **결정**: HarnessLabPage 내 탭이 아닌 독립 페이지(`/system-structure`, "My System Structure")로 만든다.
- **이유**: 시스템 구조 파악과 Harness 운영은 목적이 다르다. 같은 페이지에 넣으면 관심사가 섞이고 HarnessLabPage가 비대해진다.
- **충돌 시 확인**: 네비게이션이 너무 복잡해지면 통합 재검토.

---
## 2026-05-21 | REQ-system-map-view | TD-4: system-map 데이터를 런타임 생성으로 결정
- **결정**: API 호출 시 `generate-system-map.js`를 실행해 결과를 반환한다. 사전 생성 파일(git 커밋)을 사용하지 않는다.
- **이유**: 기존 `system-map.md`가 2026-04-24 이후 갱신되지 않아 신규 API가 누락된 선례가 있다. 수동 갱신에 의존하면 시스템 맵이 낡아 신뢰할 수 없게 된다. 이 프로젝트 규모에서 파싱 비용은 무시할 수준이다.
- **충돌 시 확인**: 응답이 느리다는 피드백이 오면 재검토. 그때는 캐시 레이어 추가로 해결하고 git 커밋 방식으로 되돌아가지 않는다.

---
## 2026-05-21 | REQ-feature-map-view | TD-1: @feature 주석 형식
- **결정**: `// @feature {name}`, `// @desc {설명}`, `// @flow {흐름}`, `// @req {slug}` — `@feature`만 필수, 나머지 선택
- **이유**: @ prefix로 grep·편집기 하이라이팅이 쉽고, REQ→코드 방향의 명시적 연결로 문서↔코드 추적 가능
- **충돌 시 확인**: 필드 추가 필요 시 generate-system-map.js 파서만 수정

---
## 2026-05-21 | REQ-feature-map-view | TD-4: REQ 연결 방식 — @req 직접 명시
- **결정**: REQ↔feature 연결은 `@req {slug}` 주석으로 직접 명시. 키워드 자동 매칭 폐기.
- **이유**: 키워드 매칭은 오탐 가능. "어떤 REQ를 구현하는가"는 개발자가 직접 선언해야 정확하다.
- **충돌 시 확인**: REQ slug 변경 시 코드 주석도 grep으로 일괄 확인 필요

---
## 2026-05-21 | REQ-feature-map-view | TD-5: @feature 주석 강제 수단
- **결정**: CLAUDE.md 규칙 + git-guard coding_standards.md WARNING 체크 두 레이어 적용
- **이유**: Claude가 코드 작성 시(CLAUDE.md)와 사람이 직접 수정 시(git-guard) 각각 catch
- **충돌 시 확인**: WARNING 노이즈가 심하면 lint 규칙으로만 유지

---
## 2026-05-21 | REQ-system-map-view | TD-2: REQ 문서 ↔ 라우트 파일 매핑 규칙
- **결정**: `REQ-{slug}.md`의 slug에 라우트 파일명(auth/skills/harness)이 포함되면 해당 도메인에 연결한다.
- **이유**: 코드 내 어노테이션 없이 파일명만으로 연결할 수 있어 유지보수 부담이 없다.
- **충돌 시 확인**: 하나의 REQ가 여러 라우트에 걸치는 경우가 생기면 REQ 파일 내 `## Dependencies` 연관 모듈 필드를 활용하는 방식으로 확장한다.

---
## 2026-05-21 | REQ-system-map-view | TD-3: 백엔드가 스크립트를 직접 실행
- **결정**: `GET /api/harness/system-map` 핸들러가 `child_process.execSync`로 `generate-system-map.js --json`을 실행한다.
- **이유**: 스크립트 로직을 백엔드 코드에 복사하지 않아 단일 진실 소스를 유지한다.
- **충돌 시 확인**: 배포 환경에서 Node 스크립트 실행 권한 문제가 생기면 스크립트 로직을 라이브러리 함수로 분리해 직접 import하는 방식으로 전환한다.

---
## 2026-05-21 | system-map-layer-context | TD-1: @table/@page 주석 형식
- **결정**: `// @table {테이블명[,테이블명]}` / `// @page {경로[,경로]}` — 쉼표 구분 복수값 허용
- **이유**: `@feature`와 동일한 `// @key value` 패턴 유지. 파서 변경 최소화.
- **충돌 시 확인**: 테이블명·경로에 공백이 포함되면 파싱 오류 가능

---
## 2026-05-21 | system-map-layer-context | TD-2: db_tables 파싱 방식
- **결정**: `schema.sql`에서 `CREATE TABLE (IF NOT EXISTS)? (\w+)` 정규식으로 테이블명만 추출
- **이유**: 컬럼 상세는 이번 범위 밖. 테이블 이름만 있어도 충분.
- **충돌 시 확인**: 마이그레이션용 ALTER TABLE은 파싱 대상 아님

---
## 2026-05-21 | system-map-layer-context | TD-3: frontend_routes 파싱 방식
- **결정**: `App.jsx`에서 `<Route path="([^"]+)"` 정규식으로 path 값만 추출
- **이유**: 컴포넌트 이름보다 path가 새 팀원에게 더 직접적.
- **충돌 시 확인**: 중첩 라우터가 생기면 App.jsx 외 파일도 파싱 필요

---
## 2026-06-02 | REQ-skill-target-agent | TD-1: target 구분은 DB 컬럼으로 관리
- **결정**: `skills.target_agent` 컬럼으로 Claude/Codex 구분을 저장한다.
- **이유**: 목록, 상세, 업로드, 다운로드 흐름에서 공통으로 쓰는 제품 데이터이므로 파일 경로나 frontmatter만으로 관리하면 필터링과 페이지네이션이 불안정하다.
- **충돌 시 확인**: 대상별 artifact 구조가 별도 테이블을 요구할 만큼 복잡해질 때 재검토한다.

---
## 2026-06-02 | REQ-skill-target-agent | TD-2: 기존 스킬은 claude로 간주
- **결정**: 기존 row의 `target_agent` 기본값은 `claude`다.
- **이유**: 현재 marketplace의 기존 스킬은 대부분 Claude용으로 운영되어 왔고, 기존 데이터가 필터에서 사라지면 사용성이 깨진다.
- **충돌 시 확인**: 기존 스킬 중 Codex용으로 재분류해야 할 데이터가 대량 확인될 때 재검토한다.

---
## 2026-06-02 | REQ-skill-target-agent | TD-3: 업로드 row 하나는 하나의 target만 가진다
- **결정**: `skills` row 하나는 하나의 `target_agent`만 가진다.
- **이유**: 현재 요구사항은 target별 업로드와 필터링이며, 하나의 logical skill 아래 여러 artifact를 관리하는 운영 불편은 아직 검증되지 않았다.
- **충돌 시 확인**: 같은 name/version의 Claude/Codex 스킬을 하나의 상세 화면에서 함께 관리해야 하는 운영 요구가 반복되면 `skill_artifacts` 분리 구조를 재검토한다.

---
## 2026-06-02 | REQ-skill-target-agent | TD-4: 필터는 서버 query 기준으로 적용
- **결정**: 목록 target 필터는 `GET /api/skills?target_agent={target}` 서버 query로 적용한다.
- **이유**: 클라이언트에서 받은 목록만 필터링하면 total/page가 필터 기준과 어긋날 수 있다.
- **충돌 시 확인**: 서버 페이지네이션을 제거하거나 전체 목록을 클라이언트에 로드하는 구조로 바뀔 때 재검토한다.

---
## 2026-06-16 | REQ-system-map-feature-relations | TD-1: 새 탭 대신 기능 지도 확장
- **결정**: Codebase 탭을 새로 만들지 않고 기존 기능 지도 카드 안에 related features 섹션을 추가한다.
- **이유**: 기능 지도와 의존성 탭이 이미 같은 문제 공간을 다루므로 새 탭은 중복 가능성이 높다.
- **충돌 시 확인**: related feature 정보가 카드 안에서 과밀해지면 별도 탭 또는 상세 패널로 분리한다.

---
## 2026-06-16 | REQ-system-map-feature-relations | TD-2: 프론트 조합 우선
- **결정**: 우선 `fetchSystemMap()`과 `fetchCallGraph()` 결과를 프론트에서 조합한다.
- **이유**: DB-risk가 없고 기존 API를 재사용해 이번 meta-sync 실험 범위를 작게 유지할 수 있다.
- **충돌 시 확인**: 계산 로직이 복잡해지거나 재사용 필요가 생기면 backend/script에서 `feature_links`를 내려주는 방식으로 이동한다.
