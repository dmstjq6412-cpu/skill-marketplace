# REQ-system-map-feature-relations: 기능 지도 codebase 연결 뷰 개선

## Overview
My System Structure의 기존 기능 지도에서 각 feature가 codebase 안에서 어떤 route, table, page, shared code, related feature와 연결되는지 한눈에 볼 수 있게 개선한다.

## Background
현재 기능 지도는 feature별 route/table/page/test를 보여주고, 의존성 탭은 shared code 파일 기준으로 영향 feature를 보여준다. 하지만 사용자는 "기능들이 서로 어떻게 얽혀 있는지"를 feature 중심으로 읽기 어렵다. 새 탭을 추가하면 기능 지도와 의존성 탭의 역할이 겹칠 수 있으므로, 기존 기능 지도 카드를 확장한다.

## Goals
- G-1: 기존 기능 지도 안에서 feature 중심 codebase 연결을 확인할 수 있다.
- G-2: 새 탭을 늘리기보다 기존 기능 지도/의존성 탭의 역할을 유지하며 중복을 줄인다.
- G-3: meta-sync 실험으로 project-guard와 feature-guard의 책임 경계를 검증한다.

## Non-Goals
- NG-1: 그래프/노드 기반 시각화는 이번 범위에서 제외한다.
- NG-2: 백엔드 DB schema/query 변경은 하지 않는다.
- NG-3: AI로 기능 관계를 추론하지 않는다. 기존 metadata와 call-graph만 사용한다.

## Functional Requirements
- FR-1: 기능 지도 카드에 related features 정보를 표시한다.
- FR-2: related feature의 연결 이유를 함께 표시한다.
- FR-3: 연결 이유는 shared table, shared page, shared code affects_features 중 확인 가능한 근거만 사용한다.
- FR-4: API 목록 탭은 기존 endpoint reference 역할을 유지한다.
- FR-5: 의존성 탭은 shared code file 중심 보조 뷰로 유지한다.

## Non-Functional Requirements
- NFR-1 (Maintainability): related feature 계산은 기존 `features` metadata와 `call-graph` 응답을 조합해 수행한다.
- NFR-2 (Performance): 추가 backend endpoint나 DB query를 만들지 않는다.
- NFR-3 (Clarity): 연결 이유는 feature 이름과 함께 표시해 추론 근거를 숨기지 않는다.

## Implementation Flow
GET /api/harness/system-map + GET /api/harness/call-graph: 기존 metadata 로드 -> feature별 shared table/page/shared code 관계 계산 -> 기능 지도 카드 확장 시 related features와 이유 표시

## Acceptance Criteria
- [ ] AC-1: 같은 table을 공유하는 feature들이 related features로 계산된다.
- [ ] AC-2: 같은 page를 공유하는 feature들이 related features로 계산된다.
- [ ] AC-3: call-graph의 shared code 영향권에 같이 포함된 feature들이 related features로 계산된다.
- [ ] AC-4: 기능 지도 카드 확장 시 related feature 이름과 연결 이유가 표시된다.
- [ ] AC-5: related feature가 없는 경우 빈 상태가 깨지지 않는다.
- [ ] AC-6: API 목록 탭의 기존 도메인/라우트 표시는 회귀하지 않는다.

## Technical Notes

### TD-1: 새 탭 대신 기능 지도 확장
- **결정**: Codebase 탭을 새로 만들지 않고 기존 기능 지도 카드 안에 related features 섹션을 추가한다.
- **이유**: 기능 지도와 의존성 탭이 이미 같은 문제 공간을 다루므로 새 탭은 중복 가능성이 높다.
- **충돌 시 확인**: related feature 정보가 카드 안에서 과밀해지면 별도 탭 또는 상세 패널로 분리한다.

### TD-2: 프론트 조합 우선
- **결정**: 우선 `fetchSystemMap()`과 `fetchCallGraph()` 결과를 프론트에서 조합한다.
- **이유**: DB-risk가 없고 기존 API를 재사용해 이번 meta-sync 실험 범위를 작게 유지할 수 있다.
- **충돌 시 확인**: 계산 로직이 복잡해지거나 재사용 필요가 생기면 backend/script에서 `feature_links`를 내려주는 방식으로 이동한다.

## Dependencies
- 선행 조건: 기존 My System Structure, feature map, call-graph API
- 연관 모듈 / 스킬: `frontend/src/pages/SystemStructurePage.jsx`, `frontend/src/__tests__/SystemStructurePage.test.jsx`, `docs/features/system-map.md`
- 관련 REQ: REQ-feature-map-view, REQ-system-map-layer-context

## Open Questions
없음

## Definition of Done
- [ ] 기능 지도 카드 확장 시 related features와 연결 이유가 표시된다.
- [ ] shared table/page/shared code 기준이 테스트로 고정된다.
- [ ] 기존 API 목록 탭과 의존성 탭이 회귀하지 않는다.
- [ ] `docs/features/system-map.md`에 이번 범위 확장 결정과 변경 이력이 남는다.

## Features
| Feature | 파일 | 타입 |
|---------|------|------|
| system-map | [docs/features/system-map.md](../features/system-map.md) | 수정 |

## Metadata
- Author: 임은섭
- Created: 2026-06-16
- Status: DRAFT
- Related PR:
