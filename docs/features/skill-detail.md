---
name: skill-detail
status: active
created: 2026-05-26
last-modified: 2026-05-26
source-req: -
---

# F: skill-detail

## Overview
스킬 상세 정보(버전 목록, 첨부 파일 포함)와 개별 첨부 파일을 조회한다.

## Endpoints
- GET /api/skills/:id
- GET /api/skills/:id/files/:fileId

## Implementation Flow
GET /:id: DB ID 조회 → 버전 목록 + 첨부 파일 목록 병렬 조회 → 상세 반환
GET /:id/files/:fileId: DB 파일 조회(id+fileId) → 파일 내용 반환

## Connected
- Tables: skills, skill_files
- Pages: /skills/:id
- REQs: -

## Decisions

## Changelog
| 날짜 | 변경 내용 | 이유 | REQ | 타입 |
|------|---------|------|-----|------|
| 2026-05-26 | 최초 생성 | Feature 파일 일괄 생성 | - | 신규 |
