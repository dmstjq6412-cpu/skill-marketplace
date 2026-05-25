---
name: harness-references
status: active
created: 2026-05-26
last-modified: 2026-05-26
source-req: -
---

# F: harness-references

## Overview
아티클 레퍼런스를 저장·조회·삭제한다. 조회 시 평가 이력(harness_evaluations)을 JOIN하고 tag 필터를 지원한다.

## Endpoints
- GET /api/harness/references
- POST /api/harness/references
- DELETE /api/harness/references/:id

## Implementation Flow
GET /references: tag 파라미터 필터 → DB 조회(harness_evaluations LEFT JOIN) → 목록 반환
POST /references: url/title 입력 검증 → DB upsert(url 기준) → id 반환
DELETE /references/:id: DB DELETE → ok 반환

## Connected
- Tables: harness_references, harness_evaluations
- Pages: /lab
- REQs: -

## Decisions

## Changelog
| 날짜 | 변경 내용 | 이유 | REQ | 타입 |
|------|---------|------|-----|------|
| 2026-05-26 | 최초 생성 | Feature 파일 일괄 생성 | - | 신규 |
