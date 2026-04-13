---
name: harness-review
description: >
  하네스 스킬 온디맨드 리뷰 스킬. 누적된 아티클 평가 이력에서
  반복 패턴을 분석하고 현재 skill.md 기준으로 가장 임팩트 있는 개선을 제안합니다.
  토큰 효율적: 아티클 재방문 없이 로컬 평가 파일만 사용합니다.
version: 2.1.0
---

# Harness Review — 스킬 온디맨드 리뷰

누적된 평가 이력에서 반복되는 갭을 찾아 현재 스킬의 개선 우선순위를 제안합니다.

---

## 사용법

```
/harness-review {skill-name}
→ 누적 평가 전체 패턴 분석

/harness-review {skill-name} "{아티클 제목 또는 URL}"
→ 특정 아티클 관점으로 재평가
예: /harness-review tdd-guard-claude "Code Agent Orchestra"
```

인자 없이 실행하면 평가 이력이 있는 스킬 목록을 보여줍니다.

---

## 실행 절차

### 1. 인자 확인

스킬명이 없으면 `.harness-lab/evaluations/` 에서 스킬 목록 출력 후 종료:
```
리뷰 가능한 스킬:
- tdd-guard-claude (평가 N회)
- git-guard-claude (평가 N회)
```

### 2. 모드 분기

**아티클 지정 모드** (`/harness-review {skill} "{아티클}"` 형태인 경우):

`.harness-lab/references/` 에서 제목 또는 URL이 일치하는 파일을 찾습니다.
파일이 있으면 해당 summary를 사용 (재방문 없음).
없으면 "저장된 아티클에서 찾을 수 없습니다. 먼저 `/harness-reference`로 저장하세요." 출력 후 종료.

`.claude/skills/{skill-name}/skill.md` + 해당 아티클 summary로 단일 평가를 수행합니다.
결과 출력 후 "기존 평가와 비교: 이 갭은 {N}회 반복됩니다 / 새로 발견된 갭입니다" 를 덧붙입니다.
→ 이후 단계 생략하고 완료.

**누적 패턴 모드** (아티클 지정 없는 경우):

아래 두 종류를 읽습니다:
- `.harness-lab/evaluations/{skill-name}-summary.md` — 관점 앵커 포함 요약 (우선)
- `.claude/skills/{skill-name}/skill.md` — 현재 스킬 구현

summary 파일이 없으면 `.harness-lab/evaluations/*-{skill-name}.json` 전체를 읽는 fallback으로 전환.

평가 이력이 아예 없으면:
"아직 평가 이력이 없습니다. `/harness-reference` 로 아티클을 저장하고 스킬을 연결하면 자동으로 평가가 누적됩니다."

### 3. 반복 패턴 분석

여러 평가에서 반복 등장하는 갭을 찾습니다:
- 2회 이상 등장한 갭 → 구조적 문제로 판단
- verdict 분포 확인 (pass/partial/needs-work 비율)

### 4. 리뷰 출력

```
## {skill-name} 리뷰 (평가 N회 기반)

### verdict 분포
pass N | partial N | needs-work N

### 반복되는 갭 (우선순위 순)
1. {가장 많이 등장한 갭} — N회 언급 (아티클 N종)
   현재 스킬에서: {skill.md의 어느 부분과 연관되는지}
   → 제안: {구체적 행동 한 줄}

2. ...

### 이번에 집중할 것
{가장 임팩트 있는 개선 1개, Golden Rule 기준}

### 코어 수정 트리거 판단
{아래 기준 중 해당하는 항목과 현재 상태 출력}
```

- 모호한 표현 금지 — 구체적 행동으로
- Golden Rule 기준: "코드 통제 + 토큰 밸런스에 기여하는가"
- 반복 갭 카운트는 **서로 다른 아티클**에서 등장한 횟수만 셉니다 (같은 아티클 관점 반복은 제외)

---

## 코어 수정 트리거 기준

harness-review 출력의 마지막에 아래 기준과 현재 상태를 대조해 출력합니다.
**자동 수정이 아닌 사람 판단을 일관되게 만드는 기준**입니다.

| 신호 | 임계값 | 액션 |
|------|--------|------|
| reject_rate 이탈 | 5회 실측 후 평균 대비 2배 이상 | code-reviewer / security-guard 기준 방향 검토 (강화인지 완화인지 판단 필요) |
| 동일 갭 반복 | 서로 다른 아티클 3종 이상에서 동일 갭 | 다음 세션 첫 작업으로 해당 스킬 수정 → harness-log "내일 바로 할 일"에 기록 |
| needs-work 누적 | 같은 스킬에 2개 이상 아티클이 needs-work | harness-review 우선 실행 후 판단 (즉시 수정 아님) |

> **reject_rate 기준 주의**: 실측 데이터가 5회 미만이면 "데이터 수집 단계 — 기준 미적용"으로 출력합니다.

### 5. 블루프린트 entry 제안 (선택)

```
이 내용을 블루프린트에 기록할까요?
change: {제안하는 변경 한 줄}
reason: {반복 갭 분석 근거}
```

승인하면 `.harness-lab/blueprints/YYYY-MM-DD-{skill}.json` 으로 저장합니다.
