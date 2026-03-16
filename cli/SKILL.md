---
name: skill-marketplace-cli
description: Skill Marketplace CLI - 스킬 탐색, 설치, 업로드 도구
argument-hint: [list [-s 검색어] | detail <id> | install <id> | upload <경로> | check]
allowed-tools: Bash
---

Skill Marketplace CLI(`node src/index.js`)를 실행하여 스킬을 탐색하고 설치합니다.

> **설치 후 초기화**: 이 스킬이 설치된 직후에는 의존성이 없을 수 있습니다.
> 아래 명령으로 먼저 초기화하세요:
> ```bash
> cd ~/.claude/skills/skill-marketplace-cli && npm install
> ```

## 인자

전달된 인자: `$ARGUMENTS`

| 명령어 | 설명 | 예시 |
|---|---|---|
| `list` | 마켓플레이스 전체 스킬 목록 조회 | `/skill-marketplace-cli list` |
| `list -s <검색어>` | 스킬 이름으로 검색 | `/skill-marketplace-cli list -s deploy` |
| `list -p <페이지>` | 페이지 지정 (기본 1) | `/skill-marketplace-cli list -p 2` |
| `detail <id>` | 특정 스킬 상세 정보 및 README 조회 | `/skill-marketplace-cli detail 1` |
| `install <id>` | 스킬을 `~/.claude/skills/`에 설치 | `/skill-marketplace-cli install 1` |
| `upload <경로>` | `.md` 파일 또는 디렉토리를 마켓플레이스에 업로드 | `/skill-marketplace-cli upload ./my-skill -n 이름 -a 작성자` |
| `check` | 로컬에 설치된 스킬과 마켓플레이스 버전 비교 | `/skill-marketplace-cli check` |

### upload 옵션

| 옵션 | 설명 | 기본값 |
|---|---|---|
| `-n, --name <이름>` | 스킬 이름 (필수) | - |
| `-a, --author <작성자>` | 작성자 이름 (필수) | - |
| `-v, --version <버전>` | 버전 | `1.0.0` |
| `-d, --description <설명>` | 한 줄 설명 | - |

> 디렉토리 업로드 시 반드시 `SKILL.md` 파일이 포함되어 있어야 합니다.

## 실행

```bash
SKILL_DIR="$HOME/.claude/skills/skill-marketplace-cli"

# 의존성 자동 설치
if [ ! -d "$SKILL_DIR/node_modules" ]; then
  echo "의존성 설치 중..."
  cd "$SKILL_DIR" && npm install --silent
fi

node "$SKILL_DIR/src/index.js" $ARGUMENTS
```

실행 결과를 사용자에게 그대로 전달합니다.

## 마켓플레이스 서버

- **API**: `https://skill-marketplace-umzq.onrender.com/api`
- **웹**: `https://skill-marketplace-alpha.vercel.app`

환경변수 `SKILL_MARKETPLACE_API`를 설정하면 다른 서버로 변경할 수 있습니다.
