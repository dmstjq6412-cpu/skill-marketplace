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
- REQs: REQ-skill-target-agent

## Decisions
### FD-1: 상세 응답은 target_agent를 포함한다
- **현재 결정**: 스킬 상세 응답과 화면은 대상 에이전트 값을 표시한다.
- **이유**: 목록에서 필터링한 스킬이 상세 화면에서도 Claude/Codex 구분을 유지해야 한다.
- **출처 REQ**: REQ-skill-target-agent FR-6, FR-9

## Changelog
| 날짜 | 변경 내용 | 이유 | REQ | 타입 |
|------|---------|------|-----|------|
| 2026-05-26 | 최초 생성 | Feature 파일 일괄 생성 | - | 신규 |
| 2026-06-02 | 상세 화면 target_agent 표시 요구사항 연결 | Claude/Codex 스킬 구분 | REQ-skill-target-agent | 수정 |
