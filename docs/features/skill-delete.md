---
name: skill-delete
status: active
created: 2026-05-26
last-modified: 2026-05-26
source-req: -
---

# F: skill-delete

## Overview
스킬을 삭제한다. 소유자(업로더)만 삭제 가능하며, 레거시 스킬(uploader_id 없음)은 인증된 사용자 누구나 삭제 가능하다.

## Endpoints
- DELETE /api/skills/:id

## Implementation Flow
DELETE /:id: 인증 확인 → DB 스킬 조회 → 소유권 검증(uploader_id 일치 또는 레거시) → DB DELETE → ok 반환

## Connected
- Tables: skills
- Pages: /skills/:id
- REQs: -

## Decisions

## Changelog
| 날짜 | 변경 내용 | 이유 | REQ | 타입 |
|------|---------|------|-----|------|
| 2026-05-26 | 최초 생성 | Feature 파일 일괄 생성 | - | 신규 |
