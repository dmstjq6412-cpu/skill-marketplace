---
name: skill-upload
status: active
created: 2026-05-26
last-modified: 2026-05-26
source-req: REQ-skill-target-agent
---

# F: skill-upload

## Overview
ZIP 또는 단일 MD 파일로 스킬을 업로드한다. 인증이 필요하며, ZIP의 경우 SKILL.md를 추출해 메타데이터를 파싱한다.

## Endpoints
- POST /api/skills

## Implementation Flow
POST /: 인증 확인 → multipart 파일 수신(upload middleware) → target_agent 검증 → ZIP이면 SKILL.md 추출 + frontmatter 파싱, MD면 직접 파싱 → DB INSERT(skills + skill_files) → id 반환

## Connected
- Tables: skills, skill_files
- Pages: /upload
- REQs: REQ-skill-target-agent

## Decisions
### FD-1: 업로드 row 하나는 하나의 target_agent만 가진다
- **현재 결정**: Claude/Codex artifact를 별도 테이블로 묶지 않고 `skills.target_agent` 단일 값으로 저장한다.
- **이유**: 현재 요구사항은 target별 업로드와 필터링이며, 다중 artifact 관리는 아직 검증된 불편이 아니다.
- **출처 REQ**: REQ-skill-target-agent TD-3

## Changelog
| 날짜 | 변경 내용 | 이유 | REQ | 타입 |
|------|---------|------|-----|------|
| 2026-05-26 | 최초 생성 | Feature 파일 일괄 생성 | - | 신규 |
| 2026-06-02 | 업로드 시 target_agent 저장 정책 추가 | Claude/Codex 스킬 구분 | REQ-skill-target-agent | 수정 |
