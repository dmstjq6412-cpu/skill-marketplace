---
name: harness-log
description: >
  Harness Lab 세션 일지 저장 스킬. 현재 대화 내용을 요약하여
  .harness-lab/logs/YYYY-MM-DD.md 에 저장하고,
  todo-architecture 기반 블루프린트 스냅샷을 .harness-lab/blueprints/YYYY-MM-DD.json 에 저장합니다.
version: 1.0.0
---

# Harness Log — 세션 일지 저장

이 스킬이 호출되면 **현재 대화를 분석**하여 Harness Lab 일지를 로컬 파일에 저장합니다.

## 실행 절차

### 1. 오늘 날짜 확인
- `date +%Y-%m-%d` 형식으로 오늘 날짜를 확인합니다.

### 2. .harness-lab 디렉토리 준비
아래 디렉토리가 없으면 생성합니다:
```
.harness-lab/
  logs/
  blueprints/
```

### 3. 대화 분석 후 일지 작성

현재 대화 전체를 검토하여 다음 섹션을 채웁니다:

**작업 요약**: 이 세션에서 실제로 구현/논의/결정된 내용을 구체적으로 기술합니다. (what was built, decided, or resolved)

**개선 포인트**: 이 세션을 통해 발견된 문제, 개선 아이디어, 다음에 할 일을 정리합니다.

**화두 & 참조자료**: 사용자가 세션 중 던진 질문/관점, 링크가 있으면 WebFetch로 내용을 가져와 한 단락으로 요약합니다.

**아키텍처 변화**: 이 세션에서 tdd-guard-claude / security-guard / git-guard-claude / todo-architecture 중 어떤 것이 어떻게 변했는지 기술합니다. 변화가 없으면 "변화 없음"으로 기록합니다.

### 4. 일지 파일 저장

경로: `.harness-lab/logs/YYYY-MM-DD.md`

형식:
```markdown
# Harness Lab — YYYY-MM-DD

## 작업 요약
<!-- 이 세션에서 한 일 -->

## 개선 포인트
<!-- 발견된 개선 사항, 다음 할 일 -->

## 화두 & 참조자료
<!-- 사용자가 언급한 관점, 링크 요약 -->

## 아키텍처 변화
<!-- todo-architecture 기준 변화 내용 -->
```

같은 날짜에 이미 파일이 있으면 기존 파일을 읽어서 내용을 합치거나 업데이트합니다.

### 5. 블루프린트 스냅샷 저장

`skills/todo-architecture/skill.md` 를 읽어 현재 스킬 상태를 JSON으로 추출합니다.

경로: `.harness-lab/blueprints/YYYY-MM-DD.json`

형식:
```json
{
  "date": "YYYY-MM-DD",
  "skills": [
    {
      "name": "tdd-guard-claude",
      "status": "DONE | TODO | IN_PROGRESS",
      "version": "v2.0.0",
      "role": "한 줄 역할 설명"
    }
  ],
  "coverage": {
    "current": 45,
    "description": "현재 커버리지 설명"
  },
  "pipeline": "파이프라인 한 줄 요약",
  "session_summary": "이 세션의 한 줄 요약"
}
```

같은 날짜 파일이 이미 있으면 `session_summary` 와 변경된 스킬 상태만 업데이트합니다.

### 6. 완료 보고

저장 완료 후 사용자에게 다음을 보고합니다:
- 일지 파일 경로
- 블루프린트 파일 경로
- 작업 요약 미리보기 (3줄 이내)
