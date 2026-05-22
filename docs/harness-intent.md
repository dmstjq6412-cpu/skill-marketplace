# 하네스 의도 기록

바이브코딩 속도를 유지하면서 코드의 의도와 품질이 소실되지 않도록 하는 통제 게이트 모음.
각 게이트는 "이 시점에 이 확인을 하지 않으면 나중에 복구할 수 없다"는 판단 하에 존재한다.

---

## 코어 스킬 정의

### req-guard

| | |
|---|---|
| **역할** | 개발 착수 전 요구사항을 확정하고, Feature 단위로 분해한다 |
| **입력** | 사용자의 피쳐 개발 요청 |
| **출력** | `docs/requirements/REQ-{slug}.md` + `docs/features/{slug}.md` 초기 생성 |
| **연결** | → tdd-guard (REQ AC를 테스트 케이스로 전달) |
|          | → project-guard (Feature decomposition 결과가 Feature 파일 초기값) |

**의도**: 스펙 없이 착수하면 피봇이 흔들리고 "왜 이 코드가 있는가"의 맥락이 사라진다. REQ 파일은 원본 의도의 불변 기록으로, 이후 project-guard가 코드와 대조하는 기준점이 된다.

---

### project-guard

| | |
|---|---|
| **역할** | 개발 중 코드가 REQ에서 얼마나, 왜 멀어졌는지를 커밋마다 기록한다 |
| **입력** | staged `backend/src/routes/*.js` 변경 + Feature 파일 |
| **출력** | Feature 파일 갱신 (Flow·FD·Changelog·Tables·Pages) |
| **연결** | ← req-guard (Feature 파일 초기값 제공) |
|          | ← git-guard (라우트 변경 커밋 시 호출) |

**의도**: req-guard가 "원래 의도"를 확정했다면, project-guard는 "실제 결정"을 추적한다. 편차가 의도적인지 아닌지를 합의로 확인하고 Feature 파일에 기록해, 유지보수 담당자가 코드 없이 "왜 여기서 달라졌나"를 파악할 수 있게 한다.

---

### tdd-guard-claude

| | |
|---|---|
| **역할** | 코드보다 테스트가 먼저 존재하도록 강제한다 |
| **입력** | 코드 작업 요청 + REQ 파일 (req-guard로부터) |
| **출력** | 테스트 파일 (제품 코드 작성 전) |
| **연결** | ← req-guard (AC → 테스트 케이스 변환) |
|          | → git-guard (테스트 작성 완료 후 커밋 흐름으로 이어짐) |

**의도**: 테스트 없이 빠르게 쌓이는 코드는 나중에 "무엇이 깨졌는지"를 알 수 없게 한다. 테스트가 먼저 있으면 코드의 의도가 실행 가능한 형태로 남는다.

---

### git-guard-claude

| | |
|---|---|
| **역할** | 커밋과 푸시가 정해진 품질 기준을 통과한 뒤에만 실행되도록 강제한다 |
| **입력** | 커밋 요청 / 푸시 요청 |
| **출력** | 커밋 실행 또는 REJECT / 푸시 실행 또는 REJECT |
| **연결** | → project-guard (커밋 시, 라우트 변경 감지하면 호출) |
|          | → code-reviewer (푸시 시 P-2/P-3으로 호출) |
|          | → security-guard (푸시 시 P-4로 호출) |

**의도**: 커밋은 "왜 바꿨는지"의 기록이고, 푸시는 팀과 공유하는 행위다. 두 시점을 구분해 커밋은 빠르게(Summary + ESLint), 푸시는 철저하게(전체 테스트 + 리뷰 + 보안) 처리한다.

---

### code-reviewer

| | |
|---|---|
| **역할** | diff 기반으로 치명적 코드 패턴을 자동 탐지한다 |
| **입력** | git diff (푸시 시) |
| **출력** | PASS 또는 REJECT (CRITICAL: 시크릿·SQLi·XSS·null역참조 등) |
| **연결** | ← git-guard (푸시 P-2/P-3으로 호출됨) |

**의도**: 빠르게 코딩할 때 자연스럽게 빠지는 치명적 버그 패턴을 사람 리뷰 전에 잡는다. security-guard와 역할을 나눠 code-reviewer는 버그·품질에 집중한다.

---

### security-guard

| | |
|---|---|
| **역할** | diff 기반으로 보안 취약점을 자동 탐지한다 |
| **입력** | git diff (푸시 시) |
| **출력** | PASS 또는 REJECT (CRITICAL: 인증·인가 누락·SSRF·약한 암호화 등) |
| **연결** | ← git-guard (푸시 P-4로 호출됨) |

**의도**: 기능 구현에 집중할 때 가장 빠트리기 쉬운 게 보안이다. code-reviewer와 분리해 보안 레이어(인증/인가/OWASP)만 집중 검사함으로써 각 게이트의 책임을 명확히 한다.

---

## 스킬 간 관계

```
개발 요청
    │
    ▼
[req-guard] ── REQ 파일 생성 (불변, 원본 의도)
    │           Feature 파일 초기 생성
    │
    ├──────────────────────────────► [tdd-guard-claude]
    │         AC → 테스트 케이스        │
    │                                  │ 테스트 작성 완료
    │                                  ▼
    │                             코드 작성
    │                                  │
    │                                  ▼
    └──────────────────────────► [git-guard-claude] ◄── 커밋 요청
                Feature 파일                │
                초기값 제공                  │ 라우트 변경 감지
                    │                       ▼
                    │              [project-guard]
                    │              Flow 비교 → 합의 → Feature 파일 갱신
                    │              (가변, 현재 상태)
                    │
                    │ 푸시 요청
                    ▼
             [git-guard-claude]
                    │
         ┌──────────┼──────────┐
         ▼          ▼          ▼
      P-1 테스트  P-2/P-3    P-4
                [code-reviewer] [security-guard]
                버그·품질      인증·인가·OWASP
```

### 산출물 흐름

| 스킬 | 산출물 | 소비자 |
|------|--------|--------|
| req-guard | REQ 파일 (불변) | project-guard가 기준점으로 참조 |
| req-guard | Feature 파일 초기값 | project-guard가 이어서 관리 |
| tdd-guard-claude | 테스트 파일 | git-guard push P-1에서 실행 |
| project-guard | Feature 파일 (Flow·FD·Changelog) | 유지보수 담당자, 다음 req-guard |
| code-reviewer | PASS/REJECT 판정 | git-guard가 푸시 차단 여부 결정 |
| security-guard | PASS/REJECT 판정 | git-guard가 푸시 차단 여부 결정 |

### req-guard ↔ project-guard 상세 분담

```
개발 前                          개발 中
req-guard                        project-guard
────────────────────────         ──────────────────────────────────
요구사항 정제·구체화              코드가 REQ에서 얼마나 멀어졌는지 추적
Feature 단위 decomposition       결정사항(FD) 누적 관리
기존 FD와 충돌 선제 탐지         Feature 파일(메타데이터) 최신 상태 유지
REQ 파일 — 불변, 원본 의도       Feature 파일 — 가변, 현재 상태
```

유지보수 담당자의 질문에 이렇게 답한다:
- "원래 의도가 뭐였나?" → REQ 파일
- "지금 어떻게 구현돼 있나?" → Feature 파일 Implementation Flow
- "왜 여기서 달라졌나?" → Feature 파일 Decisions·Changelog

---

## 통제 추가 기준

아래 질문에 답할 수 없으면 추가하지 않는다:

1. 이 통제가 없을 때 실제로 어떤 문제가 생겼는가?
2. 기존 통제로 커버할 수 없는가?
3. 이 통제의 비용(토큰, 시간, 마찰)이 편익보다 작은가?
