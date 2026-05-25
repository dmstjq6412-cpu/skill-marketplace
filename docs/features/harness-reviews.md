---
name: harness-reviews
status: active
created: 2026-05-26
last-modified: 2026-05-26
source-req: -
---

# F: harness-reviews

## Overview
스킬 리뷰 인덱스를 스킬별로 저장하고 조회한다. 저장은 전체 덮어쓰기(upsert) 방식이다.

## Endpoints
- GET /api/harness/reviews/:skill
- POST /api/harness/reviews/:skill

## Implementation Flow
GET /reviews/:skill: DB 스킬별 리뷰 인덱스 조회 → 반환 (없으면 빈 배열)
POST /reviews/:skill: content 입력 검증 → DB upsert(skill 기준 전체 덮어쓰기) → skill 반환

## Connected
- Tables: harness_review_index
- Pages: /lab
- REQs: -

## Decisions

## Changelog
| 날짜 | 변경 내용 | 이유 | REQ | 타입 |
|------|---------|------|-----|------|
| 2026-05-26 | 최초 생성 | Feature 파일 일괄 생성 | - | 신규 |
