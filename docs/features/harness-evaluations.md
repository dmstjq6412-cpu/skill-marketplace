---
name: harness-evaluations
status: active
created: 2026-05-26
last-modified: 2026-05-26
source-req: -
---

# F: harness-evaluations

## Overview
스킬 평가 이력을 저장·조회·수정·삭제한다. 삭제는 인증이 필요하다.

## Endpoints
- GET /api/harness/evaluations
- GET /api/harness/evaluations/:skill
- POST /api/harness/evaluations
- PATCH /api/harness/evaluations/:id
- DELETE /api/harness/evaluations/:id

## Implementation Flow
GET /evaluations: skill 파라미터 필터 → DB 조회(날짜 역순) → 목록 반환
GET /evaluations/:skill: DB 스킬별 평가 전체 조회 → 반환
POST /evaluations: skill/score 입력 검증 → DB INSERT → id 반환
PATCH /evaluations/:id: gap_decisions 검증 → DB UPDATE → 갱신된 결과 반환
DELETE /evaluations/:id: 인증 확인 → DB DELETE → ok 반환

## Connected
- Tables: harness_evaluations
- Pages: /lab
- REQs: -

## Decisions

## Changelog
| 날짜 | 변경 내용 | 이유 | REQ | 타입 |
|------|---------|------|-----|------|
| 2026-05-26 | 최초 생성 | Feature 파일 일괄 생성 | - | 신규 |
