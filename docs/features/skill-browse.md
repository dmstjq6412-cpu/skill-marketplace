---
name: skill-browse
status: active
created: 2026-05-26
last-modified: 2026-05-26
source-req: REQ-skill-browse
---

# F: skill-browse

## Overview
스킬 목록을 검색·페이지네이션으로 조회한다. 이름별 최신 버전만 반환하고, 이름으로 특정 스킬의 전체 버전 이력도 조회할 수 있다.

## Endpoints
- GET /api/skills
- GET /api/skills/by-name/:name

## Implementation Flow
GET /: search/page/limit 파라미터 파싱 → DB 조회(이름별 그룹핑, 최신 버전만) → 페이지네이션 메타 포함 응답
GET /by-name/:name: DB 이름 exact match 조회 → 버전 내림차순 정렬 → 전체 버전 목록 반환

## Connected
- Tables: skills
- Pages: /
- REQs: REQ-skill-browse

## Decisions

## Changelog
| 날짜 | 변경 내용 | 이유 | REQ | 타입 |
|------|---------|------|-----|------|
| 2026-05-26 | 최초 생성 | Feature 파일 일괄 생성 | REQ-skill-browse | 신규 |
