# System Map

> 자동 생성: 2026-05-25 | generate-system-map.js (spec 기반)
> call-graph: 2026-05-22 (34개 노드)

## Features (15개)

### github-oauth [active]
GitHub OAuth 콜백을 처리하고 JWT를 발급한다. 브라우저 플로우(code → onetime code → JWT)와 CLI 플로우(GitHub token → JWT) 두 가지를 지원한다.

엔드포인트: `GET /github/callback`, `GET /token`, `POST /cli`
페이지: /auth/callback
REQ: REQ-auth-flow
Decisions: 0 | Changelog: 2

### harness-analysis [active]
시범운행(harness) 분석 리포트를 날짜 기준으로 저장하고 조회한다.

엔드포인트: `GET /analysis`, `GET /analysis/:id`, `POST /analysis`
테이블: harness_analysis
페이지: /lab
Decisions: 0 | Changelog: 2

### harness-blueprint [active]
스킬별 개선 이력(blueprint)을 저장하고 조회한다. 각 스킬의 최신 entry와 전체 이력을 제공한다.

엔드포인트: `GET /blueprints`, `GET /blueprints/:skill`, `POST /blueprints`
테이블: harness_blueprints
페이지: /lab
Decisions: 0 | Changelog: 2

### harness-evaluations [active]
스킬 평가 이력을 저장·조회·수정·삭제한다. 삭제는 인증이 필요하다.

엔드포인트: `GET /evaluations`, `GET /evaluations/:skill`, `POST /evaluations`, `PATCH /evaluations/:id`, `DELETE /evaluations/:id`
테이블: harness_evaluations
페이지: /lab
Decisions: 0 | Changelog: 2

### harness-log [active]
하네스 세션 일지(Markdown)를 날짜 기준으로 저장하고 조회한다. 목록 조회 시 summary를 120자로 truncate한다.

엔드포인트: `GET /logs`, `GET /logs/:date`, `POST /logs`
테이블: harness_logs
페이지: /lab
Decisions: 0 | Changelog: 2

### harness-references [active]
아티클 레퍼런스를 저장·조회·삭제한다. 조회 시 평가 이력(harness_evaluations)을 JOIN하고 tag 필터를 지원한다.

엔드포인트: `GET /references`, `POST /references`, `DELETE /references/:id`
테이블: harness_references, harness_evaluations
페이지: /lab
Decisions: 0 | Changelog: 2

### harness-reviews [active]
스킬 리뷰 인덱스를 스킬별로 저장하고 조회한다. 저장은 전체 덮어쓰기(upsert) 방식이다.

엔드포인트: `GET /reviews/:skill`, `POST /reviews/:skill`
테이블: harness_review_index
페이지: /lab
Decisions: 0 | Changelog: 2

### harness-viz [active]
시각화 HTML 파일을 이름 기준으로 저장하고 조회한다. 허용 목록(allowlist)으로 접근 가능한 파일명을 제한한다.

엔드포인트: `GET /html/:name`, `POST /html/:name`
테이블: harness_viz
페이지: /lab
Decisions: 0 | Changelog: 2

### skill-browse [active]
스킬 목록을 검색·페이지네이션으로 조회한다. 이름별 최신 버전만 반환하고, 이름으로 특정 스킬의 전체 버전 이력도 조회할 수 있다.

엔드포인트: `GET /`, `GET /by-name/:name`
테이블: skills
페이지: /
REQ: REQ-skill-browse
Decisions: 0 | Changelog: 2

### skill-delete [active]
스킬을 삭제한다. 소유자(업로더)만 삭제 가능하며, 레거시 스킬(uploader_id 없음)은 인증된 사용자 누구나 삭제 가능하다.

엔드포인트: `DELETE /:id`
테이블: skills
페이지: /skills/:id
Decisions: 0 | Changelog: 2

### skill-detail [active]
스킬 상세 정보(버전 목록, 첨부 파일 포함)와 개별 첨부 파일을 조회한다.

엔드포인트: `GET /:id`, `GET /:id/files/:fileId`
테이블: skills, skill_files
페이지: /skills/:id
Decisions: 0 | Changelog: 2

### skill-download [active]
스킬 파일을 다운로드하고 다운로드 카운터를 증가시킨다. ZIP과 단일 MD 두 형식을 지원한다.

엔드포인트: `GET /:id/download`, `POST /:id/download`
테이블: skills
페이지: /skills/:id
Decisions: 0 | Changelog: 2

### skill-upload [active]
ZIP 또는 단일 MD 파일로 스킬을 업로드한다. 인증이 필요하며, ZIP의 경우 SKILL.md를 추출해 메타데이터를 파싱한다.

엔드포인트: `POST /`
테이블: skills, skill_files
페이지: /upload
Decisions: 0 | Changelog: 2

### system-map [active]
엔드포인트: `GET /system-map`, `GET /intent`
Decisions: 0 | Changelog: 0

### user-profile [active]
JWT로 인증된 사용자의 GitHub 정보(github_id, username)를 반환한다.

엔드포인트: `GET /me`
페이지: /
Decisions: 0 | Changelog: 2

## Routes by Domain

### auth.js

| Method | Path | Feature | 인증 |
|--------|------|---------|------|
| `GET` | `/github/callback` | github-oauth | 🔓 |
| `GET` | `/token` | github-oauth | 🔓 |
| `POST` | `/cli` | github-oauth | 🔓 |
| `GET` | `/me` | user-profile | 🔒 |

### download.js

| Method | Path | Feature | 인증 |
|--------|------|---------|------|
| `GET` | `/:id/download` | skill-download | 🔓 |

### harness.js

| Method | Path | Feature | 인증 |
|--------|------|---------|------|
| `GET` | `/logs` | harness-log | 🔓 |
| `GET` | `/logs/:date` | harness-log | 🔓 |
| `POST` | `/logs` | harness-log | 🔓 |
| `GET` | `/blueprints` | harness-blueprint | 🔓 |
| `GET` | `/blueprints/:skill` | harness-blueprint | 🔓 |
| `POST` | `/blueprints` | harness-blueprint | 🔓 |
| `GET` | `/analysis` | harness-analysis | 🔓 |
| `GET` | `/analysis/:id` | harness-analysis | 🔓 |
| `POST` | `/analysis` | harness-analysis | 🔓 |
| `GET` | `/html/:name` | harness-viz | 🔓 |
| `POST` | `/html/:name` | harness-viz | 🔓 |
| `GET` | `/references` | harness-references | 🔓 |
| `POST` | `/references` | harness-references | 🔓 |
| `GET` | `/evaluations` | harness-evaluations | 🔓 |
| `GET` | `/evaluations/:skill` | harness-evaluations | 🔓 |
| `POST` | `/evaluations` | harness-evaluations | 🔓 |
| `PATCH` | `/evaluations/:id` | harness-evaluations | 🔓 |
| `GET` | `/reviews/:skill` | harness-reviews | 🔓 |
| `POST` | `/reviews/:skill` | harness-reviews | 🔓 |
| `DELETE` | `/evaluations/:id` | harness-evaluations | 🔒 |
| `GET` | `/system-map` | system-map | 🔒 |
| `GET` | `/intent` | system-map | 🔒 |
| `DELETE` | `/references/:id` | harness-references | 🔓 |

### skills.js

| Method | Path | Feature | 인증 |
|--------|------|---------|------|
| `GET` | `/` | skill-browse | 🔓 |
| `GET` | `/by-name/:name` | skill-browse | 🔓 |
| `GET` | `/:id` | skill-detail | 🔓 |
| `GET` | `/:id/files/:fileId` | skill-detail | 🔓 |
| `POST` | `/` | skill-upload | 🔒 |
| `POST` | `/:id/download` | skill-download | 🔓 |
| `DELETE` | `/:id` | skill-delete | 🔒 |

## 공유 코드 영향 범위 (call-graph)

| 파일 | 영향 feature 수 | 영향 feature |
|------|----------------|-------------|
| backend/src/middleware/auth.js | 15 | github-oauth, user-profile, harness-log, harness-blueprint, harness-analysis... |
| backend/src/db/database.js | 13 | skill-download, harness-log, harness-blueprint, harness-analysis, harness-viz... |
| backend/src/middleware/upload.js | 5 | skill-browse, skill-detail, skill-upload, skill-download, skill-delete |
