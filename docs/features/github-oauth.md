---
name: github-oauth
status: active
created: 2026-05-26
last-modified: 2026-05-26
source-req: REQ-auth-flow
---

# F: github-oauth

## Overview
GitHub OAuth 콜백을 처리하고 JWT를 발급한다. 브라우저 플로우(code → onetime code → JWT)와 CLI 플로우(GitHub token → JWT) 두 가지를 지원한다.

## Endpoints
- GET /api/auth/github/callback
- GET /api/auth/token
- POST /api/auth/cli

## Implementation Flow
GET /github/callback: rate limit → GitHub OAuth code 수신 → access token 교환 → GitHub user 조회 → JWT 발급 → onetime code 생성 후 redirect
GET /token: rate limit → onetime code 검증(5분 TTL) → JWT 반환
POST /cli: rate limit → GitHub personal token 검증 → GitHub user 조회 → JWT 발급

## Connected
- Tables: (없음 — DB 직접 사용 없음)
- Pages: /auth/callback
- REQs: REQ-auth-flow

## Decisions

## Changelog
| 날짜 | 변경 내용 | 이유 | REQ | 타입 |
|------|---------|------|-----|------|
| 2026-05-26 | 최초 생성 | Feature 파일 일괄 생성 | REQ-auth-flow | 신규 |
