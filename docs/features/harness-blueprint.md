---
name: harness-blueprint
status: active
created: 2026-05-26
last-modified: 2026-05-26
source-req: -
---

# F: harness-blueprint

## Overview
스킬별 개선 이력(blueprint)을 저장하고 조회한다. 각 스킬의 최신 entry와 전체 이력을 제공한다.

## Endpoints
- GET /api/harness/blueprints
- GET /api/harness/blueprints/:skill
- POST /api/harness/blueprints

## Implementation Flow
GET /blueprints: DB 스킬별 최신 blueprint 조회 → 목록 반환
GET /blueprints/:skill: DB 특정 스킬 전체 이력 조회(날짜 역순) → 반환
POST /blueprints: skill/date 입력 검증 → DB upsert(skill+date 기준) → 반환

## Connected
- Tables: harness_blueprints
- Pages: /lab
- REQs: -

## Decisions

## Changelog
| 날짜 | 변경 내용 | 이유 | REQ | 타입 |
|------|---------|------|-----|------|
| 2026-05-26 | 최초 생성 | Feature 파일 일괄 생성 | - | 신규 |
