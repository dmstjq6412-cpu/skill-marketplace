# 커밋 전략

커밋은 **3단계**로 진행됩니다: 사전 검증 → 병렬 처리 → 커밋 실행

## 커밋 메세지 형식

```
[브랜치명] [git-username] [YYYY-MM-DD HH:MM:SS]

Summary: <사용자가 입력한 요약>

Changes:
- <파일명>: line <줄번호> 변경
- <파일명>: line <줄번호범위> 변경
```

예시:
```
[feature/42-user-login] [devjohn] [2026-03-24 14:30:00]

Summary: 로그인 폼에 JWT 토큰 검증 로직 추가

Changes:
- src/auth/login.ts: line 45-52 변경
- src/middleware/auth.ts: line 12 변경
- tests/auth.test.ts: line 88-95 변경
```

---

## Step 1: 사전 검증 (Summary 확인)

Summary는 반드시 사용자에게 직접 입력받아야 합니다. 자동 생성하지 마세요.

Summary가 없거나 유효하지 않으면 이후 단계로 진행하지 말고 재입력을 요청하세요:
> "커밋 Summary를 입력해주세요. 이번 변경의 목적을 한 문장으로 설명해주시면 됩니다."

**유효하지 않은 Summary 패턴 (차단):**
- 입력값이 없거나 공백만 있는 경우
- 같은 문자의 반복 (예: `1111`, `aaaa`, `....`)
- 의미없는 키보드 난타 (예: `ㅁㄴㅇㄹ`, `asdf`, `qwer`)
- 3글자 미만의 입력

위 패턴에 해당하면:
> "입력하신 Summary가 유효하지 않습니다. 이번 변경의 목적을 구체적으로 설명해주세요. (예: '사용자 로그인 JWT 검증 로직 추가')"

---

## Step 2: diff 수집 후 병렬 처리

Summary가 유효하면 아래를 실행합니다:

```bash
git diff --staged --unified=0
```

diff 출력을 얻은 즉시 아래 세 작업을 **동시에(병렬로)** 시작합니다.

### [병렬 A-1] 정적 분석 서브에이전트

`static-analyzer` 에이전트를 spawn합니다. (정의: `agents/static-analyzer.md`)

에이전트가 `static-analysis.config.yml`을 읽어 도구를 실행하고 `VERDICT + ERRORS + WARNINGS`를 반환합니다.

**새 도구 추가 방법**
1. `references/<도구명>.md` 작성 (실행 방법, 판정 기준 포함)
2. `static-analysis.config.yml`에 항목 추가 후 `enabled: true`

### [병렬 A-2] 코드 리뷰 서브에이전트

`code-reviewer` 에이전트를 spawn합니다. (정의: `agents/code-reviewer.md`)

아래 내용을 에이전트에게 전달합니다:

```
리뷰 기준 1 - 공통 보안/품질 규칙:
<references/code_review_rules.md 전체 내용을 여기에 인라인으로 포함>

리뷰 기준 2 - 언어별 패턴:
<references/coding_standards.md 전체 내용을 여기에 인라인으로 포함>

리뷰 기준 3 - 팀 전용 규칙:
<references/team_rules.md 전체 내용을 여기에 인라인으로 포함>

--- git diff 시작 ---
<git diff --staged 출력 전체>
--- git diff 끝 ---
```

에이전트가 `VERDICT + CRITICAL + WARNINGS`를 수정 제안과 함께 반환합니다.

> 참고: `references/team_rules.md`에 팀 전용 규칙을 추가하면 자동으로 코드 리뷰에 반영됩니다.

### [병렬 A-3] 유닛테스트 실행 서브에이전트

`tdd-companion` 스킬이 설치된 경우, 유닛/컴포넌트 테스트를 실행합니다.

```bash
[ -d "$HOME/.claude/skills/tdd-companion" ] && echo "INSTALLED" || echo "NOT_INSTALLED"
```

설치된 경우 서브에이전트를 spawn해 아래 명령을 실행하고 결과를 반환합니다:

```bash
# 프론트엔드 테스트 (변경 파일이 frontend/ 포함 시)
cd frontend && npx vitest run --reporter=verbose 2>&1

# 백엔드 테스트 (변경 파일이 backend/ 포함 시)
cd backend && npx vitest run --reporter=verbose 2>&1
```

에이전트는 `PASS / FAIL + 실패한 테스트 목록`을 반환합니다.

> tdd-companion이 설치되지 않은 경우 이 단계는 건너뜁니다.

### [병렬 B] 커밋 메세지 재료 수집

```bash
git branch --show-current   # 브랜치명
git config user.name        # git username
date "+%Y-%m-%d %H:%M:%S"  # 현재 시각
```

diff의 `+++ b/파일명`과 `@@ -x,y +a,b @@`에서 변경 파일명과 줄 번호를 추출합니다.

---

## Step 3: 리뷰 결과에 따른 분기

병렬 A-1(ESLint), A-2(코드 리뷰), B(재료 수집)가 모두 완료되면:

### REJECT 조건 (하나라도 해당하면 커밋 차단)

- ESLint ERROR 1개 이상
- LLM 코드 리뷰 REJECT
- 유닛테스트 FAIL (tdd-companion 설치 시)

아래 형식으로 출력하고 커밋을 실행하지 않습니다:

```
🚫 커밋이 차단되었습니다

## ESLint ERROR (해당 시)
- src/auth/login.ts:45 no-unused-vars — 'token' is defined but never used

## 코드 리뷰 CRITICAL (해당 시)
- [파일명:줄번호] 이슈 설명

## 요약
<거부 사유>

코드를 수정한 후 다시 커밋해주세요.
```

### 모두 PASS인 경우 → 커밋 진행

WARNING이 있으면 커밋 전에 먼저 출력합니다:

```
✅ 코드 리뷰 PASS

## ESLint WARNING (참고용, 해당 시)
- src/utils/helper.js:12 no-console — Unexpected console statement

## 코드 리뷰 WARNINGS (참고용, 해당 시)
- [파일명:줄번호] 경고 내용
```

그 다음 병렬 B에서 수집한 정보로 커밋 메세지를 구성하고 커밋합니다:

```bash
git commit -m "[브랜치명] [git-username] [YYYY-MM-DD HH:MM:SS]

Summary: <사용자 입력>

Changes:
- 파일명: line X-Y 변경
..."
```

---

## 체크리스트

- [ ] Summary 입력받기 (없으면 즉시 거부, 이후 단계 진행 안 함)
- [ ] Summary 유효성 검증 (trash value 차단)
- [ ] `git diff --staged` 실행
- [ ] **[병렬 A-1]** 정적 분석 서브에이전트 spawn (static-analysis.config.yml 기반, PASS/REJECT 반환)
- [ ] **[병렬 A-2]** 코드 리뷰 서브에이전트 실행 (code_review_rules.md + coding_standards.md + team_rules.md + diff 전달)
- [ ] **[병렬 A-3]** 유닛테스트 실행 서브에이전트 (tdd-companion 설치 시, PASS/FAIL 반환)
- [ ] **[병렬 B]** 브랜치명, git username, 시각 수집 + 변경 파일/줄번호 추출
- [ ] ESLint ERROR 또는 LLM REJECT 또는 유닛테스트 FAIL → 사유 출력 후 커밋 차단
- [ ] 모두 PASS → WARNING 출력 후 커밋 메세지 구성 및 실행
