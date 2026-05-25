---
name: harness-analysis
status: active
created: 2026-05-26
last-modified: 2026-05-26
source-req: -
---

# F: harness-analysis

## Overview
시범운행(harness) 분석 리포트를 날짜 기준으로 저장하고 조회한다.

## Endpoints
- GET /api/harness/analysis
- GET /api/harness/analysis/:id
- POST /api/harness/analysis

## Implementation Flow
GET /analysis: DB 분석 리포트 목록 조회(날짜 역순) → 반환
GET /analysis/:id: DB 단일 리포트 조회 → 반환
POST /analysis: 입력 검증 → DB upsert(date 기준) → id 반환

## Connected
- Tables: harness_analysis
- Pages: /lab
- REQs: -

## Decisions

## Changelog
| 날짜 | 변경 내용 | 이유 | REQ | 타입 |
|------|---------|------|-----|------|
| 2026-05-26 | 최초 생성 | Feature 파일 일괄 생성 | - | 신규 |
