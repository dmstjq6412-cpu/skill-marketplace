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
## 2026-05-21 | REQ-system-map-view | TD-2: REQ 문서 ↔ 라우트 파일 매핑 규칙
- **결정**: `REQ-{slug}.md`의 slug에 라우트 파일명(auth/skills/harness)이 포함되면 해당 도메인에 연결한다.
- **이유**: 코드 내 어노테이션 없이 파일명만으로 연결할 수 있어 유지보수 부담이 없다.
- **충돌 시 확인**: 하나의 REQ가 여러 라우트에 걸치는 경우가 생기면 REQ 파일 내 `## Dependencies` 연관 모듈 필드를 활용하는 방식으로 확장한다.

---
## 2026-05-21 | REQ-system-map-view | TD-3: 백엔드가 스크립트를 직접 실행
- **결정**: `GET /api/harness/system-map` 핸들러가 `child_process.execSync`로 `generate-system-map.js --json`을 실행한다.
- **이유**: 스크립트 로직을 백엔드 코드에 복사하지 않아 단일 진실 소스를 유지한다.
- **충돌 시 확인**: 배포 환경에서 Node 스크립트 실행 권한 문제가 생기면 스크립트 로직을 라이브러리 함수로 분리해 직접 import하는 방식으로 전환한다.
