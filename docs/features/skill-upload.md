---
name: skill-upload
status: active
created: 2026-05-26
last-modified: 2026-05-26
source-req: -
---

# F: skill-upload

## Overview
ZIP 또는 단일 MD 파일로 스킬을 업로드한다. 인증이 필요하며, ZIP의 경우 SKILL.md를 추출해 메타데이터를 파싱한다.

## Endpoints
- POST /api/skills

## Implementation Flow
POST /: 인증 확인 → multipart 파일 수신(upload middleware) → ZIP이면 SKILL.md 추출 + frontmatter 파싱, MD면 직접 파싱 → DB INSERT(skills + skill_files) → id 반환

## Connected
- Tables: skills, skill_files
- Pages: /upload
- REQs: -

## Decisions

## Changelog
| 날짜 | 변경 내용 | 이유 | REQ | 타입 |
|------|---------|------|-----|------|
| 2026-05-26 | 최초 생성 | Feature 파일 일괄 생성 | - | 신규 |
