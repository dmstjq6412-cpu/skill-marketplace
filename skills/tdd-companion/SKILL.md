---
name: tdd-companion
description: >
  코드 작업 시 테스트 코드를 자동으로 함께 작성하는 스킬.
  새 함수, 컴포넌트, API 엔드포인트를 작성하거나 기존 로직을 수정할 때 반드시 이 스킬을 사용하세요.
  "테스트 작성해줘", "TDD로 해줘", 코드 파일을 생성/수정하는 모든 상황에서 즉시 적용합니다.
---

# TDD Companion

코드를 작성하거나 수정할 때 테스트 코드를 함께 작성합니다. 목표는 80% 이상의 커버리지와 회귀 안전망 확보입니다.

이 스킬은 테스트 **작성 정책**만 담당합니다. 테스트 **실행 시점**은 `git-convention` 같은 워크플로우 스킬이 담당합니다. 서브에이전트에게 "테스트 실행하지 말 것"이라고 지시하는 이유가 여기에 있습니다.

---

## 테스트를 작성하는 경우 / 아닌 경우

**작성한다:** 새 함수·훅·유틸리티 생성, React 컴포넌트 생성·로직 변경, API 엔드포인트 생성·수정, 버그 수정, 기존 로직 리팩토링

**작성하지 않는다:** CSS/Tailwind 클래스만 변경, 설정 파일 (`vite.config.js`, `.eslintrc` 등), TypeScript 타입 정의만 추가, `package.json` 의존성 업데이트

**회귀 테스트는 선별적으로:** 버그 수정 후 재발 방지가 필요할 때, 기존 핵심 흐름을 바꿀 때, Impact Analyzer 결과에서 기존 동작이 깨질 가능성이 높을 때만 작성합니다.

---

## 실행 전 준비

### 1. 변경 스코프 판단

`git diff --stat HEAD`로 변경 파일 수와 총 변경 라인 수를 확인합니다.

- **단일 모드**: 파일 < 10 AND 변경 라인 < 300 → 메인 에이전트가 제품 코드를 직접 작성
- **멀티 모드**: 파일 ≥ 10 OR 변경 라인 ≥ 300 → 레이어 그룹핑 후 Sequential Code Writer에 위임

### 2. 테스트 프레임워크 감지

`package.json`의 `devDependencies`/`dependencies` (Python이면 `pyproject.toml`)를 읽습니다.

| 발견된 패키지 | runner | mockLib | clearMocks |
|---|---|---|---|
| `vitest` | vitest | `vi.mock`, `vi.fn()` | `vi.clearAllMocks()` |
| `jest` | jest | `jest.mock`, `jest.fn()` | `jest.clearAllMocks()` |
| `mocha` + `sinon` | mocha | `sinon.stub`, `sinon.spy()` | `sinon.restore()` |
| `pytest` | pytest | `unittest.mock.patch`, `MagicMock` | — |

확인 불가 시: 기존 테스트 파일 하나를 열어 패턴을 유추합니다. 그래도 불분명하면 사용자에게 확인합니다.

### 3. 변경 파일별 테스트 경로 계산

기존 테스트 파일이 있으면 그 위치 패턴을 우선 따릅니다. 없으면 아래 기본값을 사용합니다 (이 프로젝트 기준).

| 소스 파일 | 테스트 파일 |
|---|---|
| `frontend/src/pages/*.jsx` | `frontend/src/__tests__/*.test.jsx` |
| `frontend/src/components/*.jsx` | `frontend/src/__tests__/*.test.jsx` |
| `frontend/src/hooks/*.js` | `frontend/src/__tests__/*.test.js` |
| `frontend/src/api/*.js` | `frontend/src/__tests__/*.test.js` |
| `backend/src/routes/*.js` | `backend/tests/routes/*.test.js` |
| `backend/src/services/*.js` | `backend/tests/services/*.test.js` |
| `backend/src/utils/*.js` | `backend/tests/utils/*.test.js` |

---

## 오케스트레이션

### 단일 모드 (파일 < 10 AND 라인 < 300)

```
메인 에이전트: 제품 코드 직접 작성
      ↓
[Phase 1 - 병렬] Unit Test Worker × N + Impact Analyzer
      ↓
[Phase 2 - 조건부] Regression Writer (affected_flows가 있을 때만)
      ↓
메인 에이전트: 결과 검토 및 통합
```

### 멀티 모드 (파일 ≥ 10 OR 라인 ≥ 300)

```
메인 에이전트: 레이어 그룹핑
      ↓
[제품 코드 - 레이어 순 순차] Sequential Code Writer Layer 0 → 1 → 2 → ...
같은 레이어 내 파일은 병렬 작성 가능
      ↓
[Phase 1 - 병렬] Unit Test Worker × N + Impact Analyzer
      ↓
[Phase 2 - 조건부] Regression Writer
      ↓
메인 에이전트: 결과 검토 및 통합
```

### 레이어 정의

| Layer | 키워드 | 설명 |
|---|---|---|
| 0 | `types/`, `interfaces/`, `models/`, `entities/`, `schema/` | 데이터 구조 |
| 1 | `utils/`, `helpers/`, `lib/`, `constants/`, `config/` | 유틸리티 |
| 2 | `repositories/`, `dao/`, `store/`, `db/` | 데이터 접근 |
| 3 | `services/`, `usecases/`, `domain/` | 비즈니스 로직 |
| 4 | `controllers/`, `routes/`, `handlers/`, `api/`, `middleware/` | 인터페이스 |
| 5 | `components/`, `hooks/`, `pages/`, `views/`, `screens/` | 프레젠테이션 |

경로에서 가장 깊은 키워드를 우선 적용합니다. 미분류 파일은 Layer 3으로 배정합니다.

### 에이전트 소유권 규칙

- 단일 모드: 제품 코드는 메인 에이전트만 수정한다.
- 멀티 모드: Sequential Code Writer는 배정된 파일만 수정한다. 메인은 제품 코드를 직접 수정하지 않는다.
- Unit Test Worker는 할당된 테스트 파일만 수정한다.
- Impact Analyzer는 읽기 전용이다.
- 어느 에이전트도 다른 에이전트의 변경을 되돌릴 수 없다.

---

## 참고 자료

- 에이전트 프롬프트 템플릿: `references/prompt-templates.md`
- 플랫폼별 구현 (Codex/Claude): `references/platform-implementation.md`
- 커버리지 기준 및 테스트 품질 원칙: `references/coverage-guide.md`
- 프론트엔드 코드 패턴: `references/frontend-patterns.md`
- 백엔드 코드 패턴: `references/backend-patterns.md`
