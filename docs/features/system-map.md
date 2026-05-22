---
name: system-map
status: wip
created: 2026-05-21
last-modified: 2026-05-22
source-req: REQ-system-map-view
---

# F: system-map

## Overview
바이브코딩으로 쌓인 코드베이스의 구조(API·기능·DB·프론트 레이어)를 런타임에 파싱해 JSON으로 제공한다.
새 팀원이나 유지보수 담당자가 코드를 직접 읽지 않고 전체 기능 지도를 파악할 수 있게 한다.

## Endpoints
- GET /api/harness/system-map

## Implementation Flow
GET /api/harness/system-map: 인증 확인 → generate-system-map.js 실행 (@feature/@table/@page/@req 파싱 + schema.sql/App.jsx 파싱 포함) → domains/features/db_tables/frontend_routes JSON 반환
GET /api/harness/intent: 인증 확인 → harness-intent.md 파일 읽기 → { content } 반환 (파일 없으면 { content: '' })

## Connected
- Tables: (없음 — DB 직접 사용 없음, generate-system-map.js가 파일 파싱)
- Pages: /system-structure
- REQs: REQ-system-map-view, REQ-feature-map-view, REQ-system-map-layer-context

## Decisions

### FD-1: system-map 데이터 런타임 생성
- **현재 결정**: API 호출 시 generate-system-map.js를 execSync로 실행해 그 결과를 반환. 사전 생성 파일(git 커밋) 사용 안 함.
- **이유**: 수동 갱신에 의존하면 시스템 맵이 낡아 신뢰할 수 없게 됨. 이 프로젝트 규모에서 파싱 비용은 무시할 수준.
- **출처**: REQ-system-map-view (TD-4)
- **충돌 시 확인**: 응답이 느리다는 피드백이 오면 캐시 레이어 추가 검토. git 커밋 방식으로 되돌리지 않음.

### FD-2: @feature 어노테이션 방식으로 기능 단위 명시
- **현재 결정**: 라우트 파일에 `// @feature {name}`, `// @desc`, `// @flow`, `// @req`, `// @table`, `// @page` 주석으로 직접 명시. @feature만 필수.
- **이유**: grep·편집기 하이라이팅이 쉽고, 각 필드가 분리되어 구조화됨. 자동 추론 방식은 오탐 위험.
- **출처**: REQ-feature-map-view (TD-1), REQ-system-map-layer-context (TD-1)
- **충돌 시 확인**: 필드 추가 필요 시 generate-system-map.js 파서만 수정하면 하위 호환 가능.

## Changelog
| 날짜 | 변경 내용 | 이유 | REQ | 타입 |
|------|---------|------|-----|------|
| 2026-05-21 | 최초 생성 — generate-system-map.js --json + GET /api/harness/system-map + SystemStructurePage | 시스템 구조 파악 비용 감소 | REQ-system-map-view | 신규 |
| 2026-05-21 | @feature/@desc/@flow/@req 파싱 추가, features 배열 포함, 기능 지도 탭 추가 | API·기능 두 관점 탭 전환 제공 | REQ-feature-map-view | 수정 |
| 2026-05-21 | @table/@page 파싱 추가, db_tables/frontend_routes 최상위 배열 포함, feature 카드에 tables/pages 표시 | DB·프론트 레이어 컨텍스트 연결 | REQ-system-map-layer-context | 수정 |
| 2026-05-22 | Flow 변경: GET /intent 엔드포인트 추가 — harness-intent.md 뷰어 API | viz 탭 제거 후 하네스 의도 탭 신설 | - | A |
