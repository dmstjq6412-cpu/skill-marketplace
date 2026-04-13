---
name: harness-reference
description: >
  Harness Lab 참고자료 저장 스킬. URL을 받아 내용을 요약하고
  태그를 제안한 뒤 사용자 확인 후 .harness-lab/references/에 저장하고
  원격 서버에 업로드합니다.
version: 1.0.0
---

# Harness Reference — 참고자료 저장

URL을 받아 내용을 읽고 요약하여 Harness Lab 참고자료로 저장합니다.

---

## 실행 절차

### 1. URL 내용 읽기

WebFetch로 URL 내용을 가져옵니다.

### 2. 요약 + 태그 제안

내용을 바탕으로:
- **title**: 페이지 제목 또는 핵심 주제 한 줄
- **summary**: 3~5문장으로 핵심 내용 요약 (한국어)
- **tags**: 관련 태그 2~4개 제안

태그는 아래 기존 태그를 우선 재사용하고, 맞는 게 없으면 새로 만듭니다:
- `tdd`, `testing`, `git`, `security`, `architecture`, `refactoring`
- `typescript`, `javascript`, `react`, `node`
- `claude`, `ai`, `prompt-engineering`
- `harness`, `workflow`, `productivity`

제안 후 사용자에게 확인 요청:
```
제목: {title}
요약: {summary}
태그: {tags} ← 수정하시겠어요?
```

### 3. 사용자 확인

태그 제안 후 스킬 연결도 함께 제안합니다:

```
제목: {title}
요약: {summary}
태그: {tags}
연결 스킬: {suggested_skills} ← 태그 기반으로 추론 (없으면 "없음")

수정하시겠어요?
```

태그 → 스킬 추론 규칙:
- `tdd`, `testing` → `tdd-guard-claude`
- `git`, `workflow` → `git-guard-claude`
- `security` → `security-guard`

사용자가 "ㅇㅇ" / "ok" 로 승인하거나 수정하면 저장을 진행합니다.

### 4. 즉시 스킬 평가 (스킬 연결된 경우)

연결된 스킬이 있으면 `.claude/skills/{skill-name}/skill.md` 를 읽고 아티클 summary 기준으로 평가합니다.

평가 기준:
- 아티클의 핵심 원칙/주장을 기준으로 현재 스킬이 어떤 부분을 충족하는지 확인
- Golden Rule (코드 통제 + 토큰 밸런스) 기준으로 판단

출력 후 사용자 확인:
```
[평가 결과]
verdict: pass / partial / needs-work
gaps:
  - {빠진 것 또는 약한 부분}
suggestions:
  - {구체적 개선 방향 한 줄}

저장할까요?
```

사용자가 승인하면 평가 결과를 저장합니다.

평가 결과 로컬 저장 경로: `.harness-lab/evaluations/YYYY-MM-DD-{skill}.json`

```json
{
  "skill": "tdd-guard-claude",
  "date": "YYYY-MM-DD",
  "article_title": "...",
  "article_url": "https://...",
  "gaps": ["검증 자동화 훅 없음"],
  "suggestions": ["PreCommit 훅에서 테스트 실행 강제화"],
  "verdict": "partial"
}
```

평가 저장 후 `.harness-lab/evaluations/{skill}-summary.md` 에 한 줄 append합니다 (파일 없으면 헤더 포함 생성):

```markdown
# {skill} 평가 요약

- [YYYY-MM-DD] {verdict} | {article_title} | {gap 한 줄}
  → "{아티클의 핵심 관점 한 구절}" 관점
```

예시:
```markdown
- [2026-04-10] partial | Code Agent Orchestra | 검증 자동화 훅 없음
  → "병목이 코드 생성에서 검증으로 이동" 관점
```

- 각 gap이 여러 개면 가장 임팩트 있는 것 하나만 summary 라인에 기록 (나머지는 JSON 원본에 보존)
- 관점 구절은 아티클 summary에서 직접 인용

원격 서버 업로드 (node 인라인 스크립트):
```bash
node -e "
const fs = require('fs');
const https = require('https');
const BASE = process.env.VITE_API_URL || 'https://skill-marketplace-umzq.onrender.com';

const eval_ = JSON.parse(fs.readFileSync('<평가파일경로>', 'utf8'));
const data = JSON.stringify(eval_);
const url = new URL('/api/harness/evaluations', BASE);
const req = https.request(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
}, res => {
  let buf = '';
  res.on('data', c => buf += c);
  res.on('end', () => console.log(res.statusCode, buf));
});
req.on('error', e => console.error(e.message));
req.write(data);
req.end();
"
```

### 5. 참고자료 로컬 저장

디렉토리가 없으면 생성:
```
.harness-lab/
  references/
```

경로: `.harness-lab/references/{timestamp}-{slug}.json`
- `timestamp`: YYYYMMDDHHmmss
- `slug`: title에서 공백/특수문자 제거한 영소문자 20자

```json
{
  "title": "...",
  "url": "https://...",
  "summary": "...",
  "tags": ["tdd", "testing"],
  "skills": ["tdd-guard-claude"]
}
```

### 6. 원격 서버 업로드

> **주의: curl+jq 사용 금지. 반드시 node -e 인라인 스크립트 사용.**

```bash
node -e "
const fs = require('fs');
const https = require('https');
const BASE = process.env.VITE_API_URL || 'https://skill-marketplace-umzq.onrender.com';

const ref = JSON.parse(fs.readFileSync('<파일경로>', 'utf8'));

const data = JSON.stringify(ref);
const url = new URL('/api/harness/references', BASE);
const req = https.request(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
}, res => {
  let buf = '';
  res.on('data', c => buf += c);
  res.on('end', () => console.log(res.statusCode, buf));
});
req.on('error', e => console.error(e.message));
req.write(data);
req.end();
"
```

### 6. 완료 보고

저장 완료 후:
- 로컬 파일 경로
- 서버 업로드 결과
- Harness Lab > 참고자료 탭에서 확인 가능하다는 안내
