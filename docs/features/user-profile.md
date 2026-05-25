---
name: user-profile
status: active
created: 2026-05-26
last-modified: 2026-05-26
source-req: -
---

# F: user-profile

## Overview
JWT로 인증된 사용자의 GitHub 정보(github_id, username)를 반환한다.

## Endpoints
- GET /api/auth/me

## Implementation Flow
GET /me: 인증 확인 → user 정보(github_id, username) 반환

## Connected
- Tables: (없음)
- Pages: /
- REQs: -

## Decisions

## Changelog
| 날짜 | 변경 내용 | 이유 | REQ | 타입 |
|------|---------|------|-----|------|
| 2026-05-26 | 최초 생성 | Feature 파일 일괄 생성 | - | 신규 |
