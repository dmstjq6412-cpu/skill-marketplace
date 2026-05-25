---
name: harness-log
status: active
created: 2026-05-26
last-modified: 2026-05-26
source-req: -
---

# F: harness-log

## Overview
하네스 세션 일지(Markdown)를 날짜 기준으로 저장하고 조회한다. 목록 조회 시 summary를 120자로 truncate한다.

## Endpoints
- GET /api/harness/logs
- GET /api/harness/logs/:date
- POST /api/harness/logs

## Implementation Flow
GET /logs: DB 조회(날짜 역순) → ## 작업 요약 섹션에서 summary 파싱(120자 truncate) → 목록 반환
GET /logs/:date: 날짜 형식 검증 → DB 단일 조회 → 전문 반환
POST /logs: date/content 입력 검증 → DB upsert(date 기준) → 날짜 반환

## Connected
- Tables: harness_logs
- Pages: /lab
- REQs: -

## Decisions

## Changelog
| 날짜 | 변경 내용 | 이유 | REQ | 타입 |
|------|---------|------|-----|------|
| 2026-05-26 | 최초 생성 | Feature 파일 일괄 생성 | - | 신규 |
