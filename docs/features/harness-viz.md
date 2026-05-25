---
name: harness-viz
status: active
created: 2026-05-26
last-modified: 2026-05-26
source-req: -
---

# F: harness-viz

## Overview
시각화 HTML 파일을 이름 기준으로 저장하고 조회한다. 허용 목록(allowlist)으로 접근 가능한 파일명을 제한한다.

## Endpoints
- GET /api/harness/html/:name
- POST /api/harness/html/:name

## Implementation Flow
GET /html/:name: 허용 목록(allowlist) 검증 → DB에서 HTML 조회 → HTML 응답(Content-Type: text/html)
POST /html/:name: 허용 목록 검증 → content 입력 검증 → DB upsert(name 기준) → name 반환

## Connected
- Tables: harness_viz
- Pages: /lab
- REQs: -

## Decisions

## Changelog
| 날짜 | 변경 내용 | 이유 | REQ | 타입 |
|------|---------|------|-----|------|
| 2026-05-26 | 최초 생성 | Feature 파일 일괄 생성 | - | 신규 |
