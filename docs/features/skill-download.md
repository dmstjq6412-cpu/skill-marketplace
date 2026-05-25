---
name: skill-download
status: active
created: 2026-05-26
last-modified: 2026-05-26
source-req: -
---

# F: skill-download

## Overview
스킬 파일을 다운로드하고 다운로드 카운터를 증가시킨다. ZIP과 단일 MD 두 형식을 지원한다.

## Endpoints
- GET /api/skills/:id/download
- POST /api/skills/:id/download

## Implementation Flow
GET /:id/download: DB에서 파일 데이터 조회 + 다운로드 카운터 증가(UPDATE RETURNING) → Content-Disposition 헤더 설정 → binary 응답
POST /:id/download: 다운로드 카운터 증가 → 업데이트된 카운터 반환

## Connected
- Tables: skills
- Pages: /skills/:id
- REQs: -

## Decisions

## Changelog
| 날짜 | 변경 내용 | 이유 | REQ | 타입 |
|------|---------|------|-----|------|
| 2026-05-26 | 최초 생성 | Feature 파일 일괄 생성 | - | 신규 |
