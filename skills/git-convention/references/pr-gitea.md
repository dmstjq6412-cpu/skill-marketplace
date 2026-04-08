# PR 생성 — Gitea

`scripts/git-platform.js`를 통해 PR을 생성합니다.
토큰은 환경변수에서 읽으므로 설정 파일에 입력하지 않아도 됩니다.

## 환경변수 사전 설정 (최초 1회)

```bash
export GITEA_HOST=http://<gitea-서버-주소>
export GITEA_TOKEN=<Personal Access Token>
# 영구 적용: ~/.bashrc 또는 ~/.zshrc에 추가
```

토큰 발급: Gitea 웹 UI → Settings → Applications → Generate Token

## PR 생성

```bash
SKILL_DIR="$HOME/.claude/skills/git-convention"

node "$SKILL_DIR/scripts/git-platform.js" pr create \
  --platform gitea \
  --base <target-branch> \
  --head $(git branch --show-current) \
  --title "$(git branch --show-current): <PR 제목>" \
  --body "<변경 요약>" \
  --reviewer <리뷰어 Gitea username>
```

성공 시 출력:
```
✅ PR 생성 완료
PR URL: http://gitea.lgcns.com/team/my-repo/pulls/42
```

PR URL을 저장해 이메일 발송에 사용합니다.

## 오류 대응

| 오류 | 원인 | 처리 |
|---|---|---|
| `GITEA_HOST 환경변수가 설정되지 않았습니다` | 환경변수 미설정 | `export GITEA_HOST=...` 안내 |
| `HTTP 401` | 토큰 만료 또는 권한 부족 | 토큰 재발급 안내 |
| `HTTP 404` | owner/repo 파싱 오류 | `git remote get-url origin` 확인 |
| `HTTP 422` | 동일 PR 이미 존재 | 기존 PR URL 확인 안내 |
