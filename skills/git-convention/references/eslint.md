# ESLint 정적 분석

커밋 전 JS/TS 파일에 대해 ESLint를 실행하고 결과를 판정에 반영합니다.

## 실행 대상 파일 추출

`git diff --staged`에서 JS/TS 파일만 필터링합니다:

```bash
git diff --staged --name-only | grep -E '\.(js|jsx|ts|tsx|mjs|cjs)$'
```

추출된 파일이 없으면 ESLint 단계를 **skip**합니다 (PASS로 처리).

## ESLint 실행

```bash
# 로컬 설치 우선, 없으면 npx
ESLINT=$(npx --no-install eslint 2>/dev/null && echo "npx eslint" || echo "npx eslint")

# staged 파일만 대상으로 실행
npx eslint --no-eslintrc-lookup-warn --format json <파일목록> 2>/dev/null
```

실제 실행 명령:
```bash
npx eslint --format json $(git diff --staged --name-only | grep -E '\.(js|jsx|ts|tsx|mjs|cjs)$' | tr '\n' ' ') 2>/dev/null
```

## 환경 대응

| 상황 | 처리 |
|---|---|
| JS/TS 파일 없음 | skip (PASS) |
| `.eslintrc` / `eslint.config.*` 없음 | skip (PASS) — 규칙 없이 실행하면 의미없음 |
| ESLint 실행 실패 (exit code 2) | skip with warning 출력 |
| ESLint 정상 실행 | 결과 파싱 후 판정 |

ESLint config 존재 여부 확인:
```bash
ls .eslintrc* eslint.config.* 2>/dev/null | head -1
```

## 결과 파싱 및 판정

JSON 출력에서 `severity` 기준으로 분류합니다:

- `severity: 2` → **ERROR** → REJECT 사유
- `severity: 1` → **WARNING** → 참고용 출력만

### REJECT 기준

ERROR가 1개 이상이면 ESLint REJECT.

### 출력 형식

**REJECT 시:**
```
🔴 ESLint ERROR (커밋 차단)
- src/auth/login.ts:45 no-unused-vars — 'token' is defined but never used
- src/auth/login.ts:52 no-undef — 'process' is not defined
```

**WARNING만 있을 시:**
```
🟡 ESLint WARNING (참고용)
- src/utils/helper.js:12 no-console — Unexpected console statement
```

**PASS 시:** 별도 출력 없음

## skip 시 출력

```
⚪ ESLint skip (설정파일 없음 / JS·TS 파일 없음)
```
