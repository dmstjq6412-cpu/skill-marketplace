# PR 생성 — GitHub

`gh` CLI를 사용합니다. 사전에 `gh auth login`이 완료되어 있어야 합니다.

## Step 1: PR 생성

```bash
gh pr create \
  --base <target-branch> \
  --title "<브랜치명>: <PR 제목>" \
  --body "<변경 요약>" \
  --reviewer <리뷰어 GitHub username>
```

출력된 PR URL을 저장합니다.
예: `https://github.com/org/repo/pull/42`

## 리뷰어 없을 때

`--reviewer` 없이 생성하려는 경우 먼저 리뷰어를 요청합니다:
> "리뷰어 GitHub 사용자명을 알려주세요."

## 오류 대응

| 상황 | 처리 |
|---|---|
| `gh: command not found` | `gh auth login` 후 재시도 안내 |
| 이미 PR 존재 | 기존 PR URL 출력 후 종료 |
