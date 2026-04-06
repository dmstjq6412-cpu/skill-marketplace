# PR 생성 전략

## PR 기본 규칙

- 리뷰어를 **반드시 지정**해야 합니다. 리뷰어 없이 PR을 생성하려는 경우, 먼저 리뷰어를 지정하도록 안내하세요.
- **승인 1명 이상**을 받아야 머지할 수 있습니다.
- 머지 방식은 **merge commit (`--no-ff`)만 사용**합니다. rebase는 절대 사용하지 마세요.

## PR 머지 전 체크리스트

- [ ] 리뷰어 지정 완료
- [ ] 최소 1명 승인
- [ ] 충돌 없음
- [ ] 대상 브랜치 확인 (feature→develop 또는 feature→main)

---

## PR 생성 흐름

PR URL을 메일에 포함해야 하므로 **PR 생성 완료 후 메일을 발송**합니다.

### Step 0: 플랫폼 확인 (라우팅)

`git-platform.config.yml`을 읽어 `platform` 값 확인 후 해당 파일의 지침에 따라 PR을 생성합니다:

| platform | 참조 파일 | 방식 |
|---|---|---|
| `gitea` | `references/pr-gitea.md` | Gitea REST API (curl + token) |
| `github` | `references/pr-github.md` | GitHub CLI (`gh`) |
| `gitlab` | `references/pr-gitlab.md` | GitLab REST API (curl + token) |

> 새 플랫폼 추가 시: `references/pr-<플랫폼>.md` 작성 후 `git-platform.config.yml`에 등록

### Step 1: PR 생성

해당 플랫폼 파일의 절차에 따라 PR을 생성하고 **PR URL을 저장**합니다.

### Step 2: diff 수집

```bash
git diff <target-branch>..HEAD
```

### Step 3: 수신자 목록 확인

`references/email_recipients.md`를 읽어 수신자 목록을 확인합니다.
비고란에 조건이 명시된 수신자는 해당 조건(예: "feature→main PR만 수신")이 현재 PR과 일치할 때만 발송합니다.

### Step 4: 이메일 발송

수신자 목록의 **각 수신자에게 개별 발송**합니다.

**diff-mailer가 설치된 경우 → HTML 이메일 전송**

```bash
[ -f "$HOME/.claude/skills/diff-mailer/scripts/send_diff_mail.py" ] && echo "INSTALLED" || echo "NOT_INSTALLED"
```

diff-mailer 스킬을 사용하여 수신자별로 이메일을 전송합니다:
- **제목**: `[PR] <현재 브랜치> → <target-branch>`
- **본문**: PR URL + GitHub 스타일 HTML diff

**diff-mailer가 설치되지 않은 경우 → 텍스트 요약 이메일 전송**

```
수신자: <email_recipients.md의 수신자>
제목: [PR] <현재 브랜치> → <target-branch>

PR URL: <Step 1에서 저장한 URL>
작성자: <git config user.name>
생성 시각: <YYYY-MM-DD HH:MM:SS>

=== 변경 요약 ===
변경 파일 수: N개
- 파일명1 (+추가 줄 / -삭제 줄)

=== 주요 변경 내용 ===
<diff에서 추출한 핵심 변경사항을 3-5줄로 요약>

(상세 diff는 위 PR URL에서 확인하세요)
```

### Step 5: 메일 발송 결과 출력

```
📧 PR 알림 이메일 발송 완료
  수신자: dmstjq4034@lgcns.com (1명)
  PR URL: <PR URL>
  방식: HTML diff (diff-mailer) | 텍스트 요약 (fallback)
```

---

## 체크리스트

- [ ] `git-platform.config.yml` 읽어 플랫폼 확인
- [ ] 해당 플랫폼 파일 참조하여 PR 생성 → PR URL 저장
- [ ] diff 수집
- [ ] diff-mailer 설치 여부 확인 → HTML 이메일 또는 텍스트 fallback 발송 (PR URL 포함)
- [ ] merge commit 방식 사용 (`--no-ff`)
- [ ] rebase 절대 사용 안 함
