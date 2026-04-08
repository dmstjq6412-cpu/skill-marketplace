---
name: todo-architecture
description: >
  Enterprise Vibe Coding 안정성 아키텍처 구상 문서.
  tdd-companion, git-convention, security-guard, code-reviewer 스킬의
  전체 설계 결정 사항과 TODO를 기록합니다.
---

# Enterprise Vibe Coding — 안정성 아키텍처

## 배경

바이브 코딩 환경에서 기업 수준의 안정성을 확보하기 위한 스킬 구성 설계.
tdd-companion과 git-convention을 기반으로, 보안/리뷰/환경관리/모니터링 영역까지 커버하는 구조를 단계적으로 구축한다.

---

## 전체 파이프라인

```
[코드 작성]        [리뷰 / 보안]            [커밋 / 머지]       [런타임]
tdd-companion  →  code-reviewer        →  git-convention  →  외부 도구
               →  security-guard (TODO)                      (Sentry 등)
```

훅 체인 (git-convention이 오케스트레이션):
- PreCommit  → tdd-companion
- PrePush    → code-reviewer → security-guard (TODO)
- PreCommit  → .env / secrets 패턴 감지 훅 (TODO)

---

## 스킬별 상태

| 스킬 | 상태 | 역할 |
|---|---|---|
| tdd-companion | **DONE** (v2.0.0) | 테스트 자동 작성, 스코프 기반 단일/멀티 모드 |
| git-convention | **DONE** | 브랜치/커밋 컨벤션, 훅 체인 오케스트레이션 |
| code-reviewer | **DONE** | 로직/품질 리뷰, PASS/REJECT 판정 |
| security-guard | **TODO** | 보안 취약점 탐지 |
| 환경 관리 훅 | **TODO** | .env/secrets 커밋 방지 (스킬 불필요, 훅으로 처리) |
| 에러 모니터링 | **외부 도구** | Claude 개입 영역 아님 (Sentry/Datadog) |

---

## 안정성 커버리지 추정

- **현재** (~45%): tdd-companion + git-convention + code-reviewer
- **security-guard 추가 후** (~65%): 보안 + 환경 훅 포함
- **외부 모니터링 연동 후** (~80%): 이론상 자동화 한계
- **나머지 20%**: 도메인 로직 복잡도, 팀 숙련도 등 자동화 불가 영역

---

## 오케스트레이터 도입 판단

현재는 **별개 스킬 방식 유지**. 이유:
- security-guard 미완성 상태에서 오케스트레이터 설계 시 이중 변경 발생
- git-convention이 이미 훅 체인으로 가벼운 오케스트레이터 역할 수행

**오케스트레이터 도입 시점**: 스킬 3개 이상 안정화 + 스킬 간 결과 참조 필요 시

---

## TODO 목록

### security-guard 스킬 (신규)
- [ ] 인증/인가 누락 탐지
- [ ] SQL Injection / XSS 탐지
- [ ] 민감 정보 하드코딩 탐지
- [ ] 레이어 의존 방향 위반 탐지 (Layer 상위가 하위를 import하는 경우)
- [ ] OWASP Top 10 기준 적용
- [ ] git-convention PrePush 훅에 연결

### 환경 관리 훅
- [ ] .env, *.pem, *.key 등 패턴 감지 PreCommit 훅
- [ ] git-convention hooks/ 에 추가

### tdd-companion 개선 (v2.x)
- [ ] 임계값 튜닝 (현재: 파일 < 10 AND 라인 < 300) — 실사용 후 조정
- [ ] Sequential Code Writer 컨텍스트 전달 품질 검증

### 아키텍처 문서
- [ ] 시각화 HTML (`enterprise-vibe-architecture.html`) 지속 업데이트

---

## 설계 결정 기록

**tdd-companion 단일/멀티 모드 분기**
- 파일 수만 보는 것은 부정확 → git diff --stat으로 변경 라인 수도 함께 판단
- 임계값: 파일 < 10 AND 라인 < 300 → 단일, 하나라도 초과 → 멀티

**레이어 그룹핑 전략**
- 의존 그래프 분석은 오버킬 → 경로 키워드 매칭으로 레이어 판별
- Layer 0(타입) → 5(프레젠테이션) 순 순차, 같은 레이어 내 병렬
- 미분류 파일은 Layer 3(Business Logic) 배정

**보안은 별개 스킬**
- tdd-companion에 포함 시 단일 책임 원칙 위반
- 보안 정책 변경 시 tdd-companion 수정 불필요하도록 분리

**환경 관리는 스킬이 아닌 훅**
- 로직이 단순(파일 패턴 감지)해서 스킬로 만들 필요 없음
