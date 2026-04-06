# 푸시 전략 (PrePush)

`git push` 실행 전 회귀 테스트를 실행해 기존 시스템이 깨지지 않았는지 검증합니다.

> **왜 푸시 시점인가?**
> 커밋은 브랜치 내 작업 저장 단계입니다. 푸시는 코드를 팀과 공유하거나 PR을 올리기 직전 단계로, "내 변경이 전체 시스템에 영향을 주지 않는가"를 검증하기에 가장 자연스러운 게이트입니다.

---

## 실행 조건

`tdd-companion` 스킬이 설치된 경우에만 실행합니다:

```bash
[ -d "$HOME/.claude/skills/tdd-companion" ] && echo "INSTALLED" || echo "NOT_INSTALLED"
```

설치되지 않은 경우 이 단계를 건너뛰고 푸시를 진행합니다.

---

## 회귀 테스트 실행 흐름

### Step 1: 변경 범위 파악

```bash
git diff origin/<현재 브랜치>...HEAD --name-only 2>/dev/null || git diff HEAD~1 --name-only
```

변경된 파일 목록을 확인해 frontend / backend 중 어느 쪽이 영향받는지 파악합니다.

### Step 2: 회귀 테스트 파일 탐색

변경된 파일과 연관된 테스트 파일 중 회귀 테스트 패턴을 가진 파일을 찾습니다:

| 위치 | 대상 |
|------|------|
| `frontend/src/__tests__/*.test.jsx` | 프론트엔드 회귀 테스트 |
| `backend/tests/**/*.test.js` | 백엔드 회귀 테스트 |

### Step 3: 전체 테스트 스위트 실행

변경된 영역에 따라 실행합니다:

```bash
# 프론트엔드 변경 포함 시
cd frontend && npx vitest run --reporter=verbose 2>&1

# 백엔드 변경 포함 시
cd backend && npx vitest run --reporter=verbose 2>&1
```

---

## 결과 처리

### PASS → 푸시 진행

```
✅ 회귀 테스트 PASS — 푸시를 진행합니다.
```

### FAIL → 푸시 차단

```
🚫 푸시가 차단되었습니다 — 회귀 테스트 실패

## 실패한 테스트
- <테스트 파일>: <테스트 이름>
  오류: <오류 메시지>

## 원인 분석
<어떤 변경이 해당 테스트를 깨뜨렸는지 간략히>

코드 또는 테스트를 수정한 후 다시 푸시해주세요.
```

---

## 체크리스트

- [ ] tdd-companion 설치 여부 확인
- [ ] 미설치 시 건너뜀, 설치 시 계속 진행
- [ ] 변경 범위 파악 (frontend / backend)
- [ ] 해당 영역 전체 테스트 실행
- [ ] FAIL 시 사유 출력 후 푸시 차단
- [ ] PASS 시 푸시 진행
