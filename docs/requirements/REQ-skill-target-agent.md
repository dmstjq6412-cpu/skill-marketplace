# REQ-skill-target-agent: Skill Target Agent

## Overview
스킬 업로드 시 대상 에이전트(`claude`, `codex`)를 명시하고, 목록/상세 화면에서 대상별로 구분해 볼 수 있게 한다.

## Background
현재 Skill Marketplace는 Claude용 스킬과 Codex용 스킬을 제품 데이터 수준에서 구분하지 않는다. 업로드된 스킬이 어느 에이전트용인지 알기 어렵고, 화면에서도 Claude용/Codex용을 필터링할 수 없다.

## Goals
- G-1: 업로드된 스킬이 Claude용인지 Codex용인지 데이터로 구분된다.
- G-2: 목록 화면에서 All/Claude/Codex 필터로 스킬을 조회할 수 있다.
- G-3: 기존 스킬 데이터는 마이그레이션 후에도 조회 가능해야 한다.

## Non-Goals
- NG-1: 하나의 업로드로 Claude/Codex 양쪽 artifact를 동시에 관리하는 구조는 이번 범위에서 제외한다.
- NG-2: 실제 로컬 설치 경로에 자동 설치하는 기능은 제외한다.
- NG-3: Claude/Codex 외 타겟 에이전트 추가는 제외한다.

## Functional Requirements
- FR-1: `POST /api/skills` 업로드 요청은 `target_agent` 값을 받는다.
- FR-2: `target_agent` 허용 값은 `claude`, `codex` 두 개다.
- FR-3: `target_agent`가 없거나 허용되지 않는 값이면 업로드를 `400`으로 거부한다.
- FR-4: `GET /api/skills`는 optional `target_agent` query로 목록을 필터링한다.
- FR-5: `GET /api/skills`는 응답 skill 객체에 `target_agent`를 포함한다.
- FR-6: `GET /api/skills/:id`는 상세 응답에 `target_agent`를 포함한다.
- FR-7: 목록 UI는 `All`, `Claude`, `Codex` 필터를 제공한다.
- FR-8: 업로드 UI는 대상 에이전트 선택값을 제공하고 formData에 `target_agent`를 포함한다.
- FR-9: 스킬 카드와 상세 화면은 대상 에이전트를 표시한다.
- FR-10: 기존 데이터는 기본값 `claude`로 유지한다.

## Non-Functional Requirements
- NFR-1 (Maintainability): 대상 에이전트 값 검증은 서버에서 수행한다.
- NFR-2 (Compatibility): 기존 rows는 `claude` 기본값으로 조회 가능해야 한다.
- NFR-3 (UX): 목록 필터는 검색/페이지네이션과 함께 서버 query 기준으로 적용되어야 한다.

## Implementation Flow
- `POST /api/skills`: 인증 확인 -> multipart 수신 -> `target_agent` 검증 -> SKILL.md 파싱 -> `skills.target_agent` 저장 -> id 반환
- `GET /api/skills`: search/page/limit/target_agent 파싱 -> target 필터 적용 -> 이름별 최신 버전 목록 반환
- `GET /api/skills/:id`: id 조회 -> target_agent 포함 상세 반환
- frontend `/upload`: 대상 에이전트 선택 -> formData에 `target_agent` 포함 -> 업로드
- frontend `/`: 대상 필터 선택 -> API query에 `target_agent` 포함 -> 목록 갱신

## Acceptance Criteria
- [ ] AC-1: Claude로 업로드한 스킬은 `target_agent: claude`로 저장된다.
- [ ] AC-2: Codex로 업로드한 스킬은 `target_agent: codex`로 저장된다.
- [ ] AC-3: 잘못된 `target_agent` 값은 `400`으로 거부된다.
- [ ] AC-4: 목록에서 Claude 필터 선택 시 Claude 스킬만 조회한다.
- [ ] AC-5: 목록에서 Codex 필터 선택 시 Codex 스킬만 조회한다.
- [ ] AC-6: All 필터는 양쪽 스킬을 모두 조회한다.
- [ ] AC-7: 기존 스킬은 마이그레이션 후 Claude 스킬로 조회된다.
- [ ] AC-8: 스킬 카드/상세 화면에서 대상 에이전트가 표시된다.

## Technical Notes

### TD-1: target 구분은 DB 컬럼으로 관리
- **결정**: `skills.target_agent` 컬럼으로 Claude/Codex 구분을 저장한다.
- **이유**: 목록, 상세, 업로드, 다운로드 흐름에서 공통으로 쓰는 제품 데이터이므로 파일 경로나 frontmatter만으로 관리하면 필터링과 페이지네이션이 불안정하다.
- **충돌 시 확인**: 대상별 artifact 구조가 별도 테이블을 요구할 만큼 복잡해질 때 재검토한다.

### TD-2: 기존 스킬은 claude로 간주
- **결정**: 기존 row의 `target_agent` 기본값은 `claude`다.
- **이유**: 현재 marketplace의 기존 스킬은 대부분 Claude용으로 운영되어 왔고, 기존 데이터가 필터에서 사라지면 사용성이 깨진다.
- **충돌 시 확인**: 기존 스킬 중 Codex용으로 재분류해야 할 데이터가 대량 확인될 때 재검토한다.

### TD-3: 업로드 row 하나는 하나의 target만 가진다
- **결정**: `skills` row 하나는 하나의 `target_agent`만 가진다.
- **이유**: 현재 요구사항은 target별 업로드와 필터링이며, 하나의 logical skill 아래 여러 artifact를 관리하는 운영 불편은 아직 검증되지 않았다.
- **충돌 시 확인**: 같은 name/version의 Claude/Codex 스킬을 하나의 상세 화면에서 함께 관리해야 하는 운영 요구가 반복되면 `skill_artifacts` 분리 구조를 재검토한다.

### TD-4: 필터는 서버 query 기준으로 적용
- **결정**: 목록 target 필터는 `GET /api/skills?target_agent={target}` 서버 query로 적용한다.
- **이유**: 클라이언트에서 받은 목록만 필터링하면 total/page가 필터 기준과 어긋날 수 있다.
- **충돌 시 확인**: 서버 페이지네이션을 제거하거나 전체 목록을 클라이언트에 로드하는 구조로 바뀔 때 재검토한다.

## Dependencies
- 선행 조건: 없음
- 연관 모듈 / 스킬: `skill-upload`, `skill-browse`, `skill-detail`
- 관련 REQ: -

## Open Questions
- 없음

## Definition of Done
- [ ] DB schema에 `skills.target_agent`가 추가되고 기존 데이터 기본값이 `claude`로 보정된다.
- [ ] backend 업로드/목록/상세 API 테스트가 target 구분을 검증한다.
- [ ] frontend 업로드/목록/카드/상세 테스트가 target 선택과 표시를 검증한다.
- [ ] Feature 문서의 Connected/Decisions/Changelog가 변경과 일치한다.

## Features
| Feature | 파일 | 타입 |
|---------|------|------|
| skill-upload | [docs/features/skill-upload.md](../features/skill-upload.md) | 수정 |
| skill-browse | [docs/features/skill-browse.md](../features/skill-browse.md) | 수정 |
| skill-detail | [docs/features/skill-detail.md](../features/skill-detail.md) | 수정 |

## Metadata
- Author: 임은섭
- Created: 2026-06-02
- Status: DRAFT
- Related PR:
