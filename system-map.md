# System Map

> 자동 생성: 2026-04-24 | generate-system-map.js

## auth.js

| 기능명 | Method | Path | 로직 위치 | 연관 파일 | 연관 테스트 | 인증 |
|--------|--------|------|-----------|-----------|------------|------|
| JWT를 URL에 직접 노출하지 않고 일회용 코드로 교환 | `GET` | `/github/callback` | auth.js:101 | App.jsx (auth flow) | backend/tests/routes/auth.test.js | 🔓 |
| GET /api/auth/token?code=xxx — 일회용 코드를 JWT로 교환 | `GET` | `/token` | auth.js:122 | App.jsx (auth flow) | backend/tests/routes/auth.test.js | 🔓 |
| POST /api/auth/cli — CLI (gh auth token) 흐름 | `POST` | `/cli` | auth.js:131 | App.jsx (auth flow) | backend/tests/routes/auth.test.js | 🔓 |
| GET /api/auth/me — 현재 사용자 정보 (프론트엔드용) | `GET` | `/me` | auth.js:146 | App.jsx (auth flow) | backend/tests/routes/auth.test.js | 🔒 |

## download.js

| 기능명 | Method | Path | 로직 위치 | 연관 파일 | 연관 테스트 | 인증 |
|--------|--------|------|-----------|-----------|------------|------|
| GET /api/skills/:id/download | `GET` | `/:id/download` | download.js:7 | SkillCard.jsx / SkillDetailPage.jsx | — | 🔓 |

## harness.js

| 기능명 | Method | Path | 로직 위치 | 연관 파일 | 연관 테스트 | 인증 |
|--------|--------|------|-----------|-----------|------------|------|
| GET /api/harness/logs | `GET` | `/logs` | harness.js:8 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| GET /api/harness/logs/:date | `GET` | `/logs/:date` | harness.js:27 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| POST /api/harness/logs | `POST` | `/logs` | harness.js:44 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| GET /api/harness/blueprints — 스킬 목록 (각 스킬의 최신 entry + 총 기록 수) | `GET` | `/blueprints` | harness.js:63 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| GET /api/harness/blueprints/:skill — 특정 스킬의 전체 개선 히스토리 | `GET` | `/blueprints/:skill` | harness.js:86 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| body: { skill, date, change, reason?, issues?, articles? } | `POST` | `/blueprints` | harness.js:104 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| GET /api/harness/analysis | `GET` | `/analysis` | harness.js:127 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| GET /api/harness/analysis/:id | `GET` | `/analysis/:id` | harness.js:141 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| POST /api/harness/analysis | `POST` | `/analysis` | harness.js:155 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| GET /api/harness/html/:name | `GET` | `/html/:name` | harness.js:181 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| POST /api/harness/html/:name | `POST` | `/html/:name` | harness.js:197 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| GET /api/harness/references | `GET` | `/references` | harness.js:217 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| POST /api/harness/references | `POST` | `/references` | harness.js:255 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| GET /api/harness/evaluations — 전체 평가 이력 (skill 쿼리 파라미터로 필터 가능) | `GET` | `/evaluations` | harness.js:278 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| GET /api/harness/evaluations/:skill | `GET` | `/evaluations/:skill` | harness.js:300 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| POST /api/harness/evaluations | `POST` | `/evaluations` | harness.js:316 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| PATCH /api/harness/evaluations/:id — gap_decisions 업데이트 | `PATCH` | `/evaluations/:id` | harness.js:336 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| GET /api/harness/reviews/:skill | `GET` | `/reviews/:skill` | harness.js:357 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| POST /api/harness/reviews/:skill — 인덱스 전체 덮어쓰기 | `POST` | `/reviews/:skill` | harness.js:371 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| DELETE /api/harness/evaluations/:id | `DELETE` | `/evaluations/:id` | harness.js:390 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |
| DELETE /api/harness/references/:id | `DELETE` | `/references/:id` | harness.js:404 | HarnessLabPage.jsx | backend/tests/routes/harness.test.js | 🔓 |

## skills.js

| 기능명 | Method | Path | 로직 위치 | 연관 파일 | 연관 테스트 | 인증 |
|--------|--------|------|-----------|-----------|------------|------|
| GET /api/skills | `GET` | `/` | skills.js:19 | SkillCard.jsx / SkillDetailPage.jsx | backend/tests/routes/skills.test.js | 🔓 |
| GET /api/skills/by-name/:name | `GET` | `/by-name/:name` | skills.js:60 | SkillCard.jsx / SkillDetailPage.jsx | backend/tests/routes/skills.test.js | 🔓 |
| GET /api/skills/:id | `GET` | `/:id` | skills.js:88 | SkillCard.jsx / SkillDetailPage.jsx | backend/tests/routes/skills.test.js | 🔓 |
| GET /api/skills/:id/files/:fileId | `GET` | `/:id/files/:fileId` | skills.js:119 | SkillCard.jsx / SkillDetailPage.jsx | backend/tests/routes/skills.test.js | 🔓 |
| 수정: author를 trim() 한 뒤 falsy 체크하여 공백 문자열도 거부 | `POST` | `/` | skills.js:138 | SkillCard.jsx / SkillDetailPage.jsx | backend/tests/routes/skills.test.js | 🔒 |
| POST /api/skills/:id/download | `POST` | `/:id/download` | skills.js:200 | SkillCard.jsx / SkillDetailPage.jsx | backend/tests/routes/skills.test.js | 🔓 |
| DELETE /api/skills/:id | `DELETE` | `/:id` | skills.js:216 | SkillCard.jsx / SkillDetailPage.jsx | backend/tests/routes/skills.test.js | 🔒 |

## client.js (프론트엔드 API)

| 함수명 | 위치 | 연관 테스트 |
|--------|------|------------|
| `fetchSkills` | client.js:15 | frontend/src/__tests__/client.test.js |
| `fetchSkill` | client.js:18 | frontend/src/__tests__/client.test.js |
| `uploadSkill` | client.js:21 | frontend/src/__tests__/client.test.js |
| `deleteSkill` | client.js:24 | frontend/src/__tests__/client.test.js |
| `getDownloadUrl` | client.js:27 | frontend/src/__tests__/client.test.js |
| `fetchSkillFile` | client.js:29 | frontend/src/__tests__/client.test.js |
| `fetchHarnessLogs` | client.js:32 | frontend/src/__tests__/client.test.js |
| `fetchHarnessLog` | client.js:35 | frontend/src/__tests__/client.test.js |
| `fetchHarnessBlueprints` | client.js:38 | frontend/src/__tests__/client.test.js |
| `fetchHarnessBlueprintBySkill` | client.js:41 | frontend/src/__tests__/client.test.js |
| `fetchHarnessAnalyses` | client.js:44 | frontend/src/__tests__/client.test.js |
| `fetchHarnessAnalysis` | client.js:47 | frontend/src/__tests__/client.test.js |
| `fetchHarnessReferences` | client.js:50 | frontend/src/__tests__/client.test.js |
| `deleteHarnessReference` | client.js:53 | frontend/src/__tests__/client.test.js |
| `fetchHarnessEvaluations` | client.js:56 | frontend/src/__tests__/client.test.js |
| `fetchAllHarnessEvaluations` | client.js:59 | frontend/src/__tests__/client.test.js |
| `patchHarnessEvaluation` | client.js:63 | frontend/src/__tests__/client.test.js |
| `deleteHarnessEvaluation` | client.js:66 | frontend/src/__tests__/client.test.js |
| `fetchMe` | client.js:70 | frontend/src/__tests__/client.test.js |
| `exchangeAuthCode` | client.js:73 | frontend/src/__tests__/client.test.js |
| `loginWithCliToken` | client.js:76 | frontend/src/__tests__/client.test.js |
| `getGithubLoginUrl` | client.js:79 | frontend/src/__tests__/client.test.js |

