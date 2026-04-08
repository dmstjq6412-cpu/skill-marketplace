---
name: git-convention
description: 팀 Git 컨벤션을 자동으로 적용하는 스킬. 브랜치 생성, 커밋, 머지 등 모든 git 관련 작업 시 반드시 이 스킬을 사용하세요. 사용자가 "브랜치 만들어줘", "커밋해줘", "머지해줘", "git 작업", "PR 만들어줘", "feature 브랜치", "develop에 올려줘", "main에 반영해줘" 등 git과 관련된 어떤 작업을 언급하더라도 이 스킬을 트리거하세요. 팀 온보딩 목적으로, Claude가 git 작업을 수행할 때 아래 규칙을 항상 따릅니다.
---

# Git Convention 스킬

이 스킬은 팀의 git 작업 표준을 정의합니다. Claude가 git 관련 작업 요청을 받으면, 아래 표를 보고 해당 reference 파일을 읽은 뒤 그 지침을 따릅니다.

> **전체 워크플로우 시각화**: `git-convention-flow.html`을 브라우저에서 열면 전체 흐름을 한눈에 볼 수 있습니다.

---

## 작업 유형별 reference 안내

| 사용자 요청 예시 | 읽어야 할 파일 |
|---|---|
| 브랜치 만들어줘, feature 시작, 이슈 작업 시작 | `references/branch.md` |
| 커밋해줘, commit, 변경사항 저장 | `references/commit.md` |
| PR 만들어줘, 올려줘, develop/main에 PR | `references/pr.md` |
| 머지해줘, develop 반영, main 배포, 동기화 | `references/merge.md` |
| 코드 수정, 파일 편집, 기능 구현, 버그 수정 등 모든 코드 작업 | `references/branch.md` (현재 브랜치 확인 필수) |
| 푸시해줘, push, git push, 원격에 올려줘 | `references/push.md` |

---

## reference 파일 목록

| 파일 | 역할 |
|---|---|
| `references/branch.md` | 브랜치 생성/네이밍/삭제 규칙 |
| `references/commit.md` | 커밋 3단계 (Summary 검증 → 병렬 리뷰+수집 → 실행) |
| `references/pr.md` | PR 생성 + diff 이메일 발송 흐름 |
| `references/merge.md` | 머지 전략 + main→develop 동기화 |
| `references/push.md` | 푸시 전 회귀 테스트 실행 (tdd-companion 연동) |
| `references/code_review_rules.md` | 커밋 시 코드 리뷰 기준 (CRITICAL/WARNING) |
| `references/coding_standards.md` | 언어별 안전/위험 패턴 |
| `references/team_rules.md` | 팀 전용 커스텀 규칙 (자유롭게 추가 가능) |
| `references/email_recipients.md` | PR 알림 이메일 수신자 목록 (자유롭게 추가/제거 가능) |

> **`TODO/` 디렉토리는 읽지 마세요.** 스킬 동작과 무관한 내부 메모(보류/예정 작업)입니다.

---

## 설치 후 설정

이 스킬은 커밋 흐름에서 서브에이전트를 사용합니다. 스킬 설치 후 아래 파일을 `~/.claude/agents/` 에 복사해야 에이전트가 정상 동작합니다.

```bash
cp ~/.claude/skills/git-convention/agents/static-analyzer.md ~/.claude/agents/
cp ~/.claude/skills/git-convention/agents/code-reviewer.md ~/.claude/agents/
```

| 파일 | 역할 |
|---|---|
| `agents/static-analyzer.md` | 정적 분석 전담 (ESLint, SonarQube 등) |
| `agents/code-reviewer.md` | 코드 리뷰 전담 (보안/품질/팀 규칙) |
