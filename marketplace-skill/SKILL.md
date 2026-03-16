---
name: marketplace
description: Skill Marketplace 탐색 및 설치 - 목록 조회, 상세 조회, 스킬 설치
argument-hint: [list [-s 검색어] | detail <id> | install <id>]
allowed-tools: Bash
---

Skill Marketplace에서 스킬을 탐색하고 설치합니다.

> **사전 조건**: `skill-marketplace-cli` 스킬이 설치되어 있어야 합니다.
> 미설치 시 마켓플레이스 웹사이트(https://skill-marketplace-alpha.vercel.app)에서 ID를 확인 후 아래 명령으로 설치하세요.
> ```bash
> node ~/.claude/skills/skill-marketplace-cli/src/index.js install <id>
> ```

## 인자

전달된 인자: `$ARGUMENTS`

| 인자 | 설명 | 예시 |
|---|---|---|
| `list` | 전체 스킬 목록 조회 | `/marketplace list` |
| `list -s <검색어>` | 스킬 이름으로 검색 | `/marketplace list -s deploy` |
| `list -p <페이지>` | 페이지 지정 | `/marketplace list -p 2` |
| `detail <id>` | 스킬 상세 정보 및 README 조회 | `/marketplace detail 3` |
| `install <id>` | 스킬을 `~/.claude/skills/`에 설치 | `/marketplace install 3` |
| (없음) | 전체 목록 조회 (list와 동일) | `/marketplace` |

## 실행

아래 단계를 순서대로 실행하세요.

### 1. CLI 존재 확인

```bash
CLI_DIR="$HOME/.claude/skills/skill-marketplace-cli"

if [ ! -f "$CLI_DIR/src/index.js" ]; then
  echo "CLI_NOT_FOUND"
fi
```

출력이 `CLI_NOT_FOUND`이면 즉시 중단하고 사용자에게 안내합니다:

> **skill-marketplace-cli가 설치되어 있지 않습니다.**
>
> 마켓플레이스(https://skill-marketplace-alpha.vercel.app)에서 `skill-marketplace-cli`를 검색하여 ID를 확인한 뒤 아래 명령으로 설치하세요:
> ```bash
> node ~/.claude/skills/<다른_cli>/src/index.js install <id>
> ```
> 또는 GitHub에서 직접 클론할 수 있습니다:
> ```bash
> git clone https://github.com/dmstjq6412-cpu/skill-marketplace.git /tmp/sm
> cp -r /tmp/sm/cli ~/.claude/skills/skill-marketplace-cli
> cd ~/.claude/skills/skill-marketplace-cli && npm install
> ```

### 2. 의존성 확인 및 자동 설치

```bash
CLI_DIR="$HOME/.claude/skills/skill-marketplace-cli"

if [ ! -d "$CLI_DIR/node_modules" ]; then
  echo "의존성 설치 중..."
  cd "$CLI_DIR" && npm install --silent
fi
```

### 3. 명령 실행

인자(`$ARGUMENTS`)가 비어 있으면 `list`로 처리합니다.

```bash
CLI_DIR="$HOME/.claude/skills/skill-marketplace-cli"
ARGS="${ARGUMENTS:-list}"

node "$CLI_DIR/src/index.js" $ARGS
```

### 4. 결과 안내

명령별로 아래 내용을 추가로 안내합니다:

- **list**: 목록 출력 후 → `detail <id>`로 상세 조회, `install <id>`로 설치 가능함을 안내
- **detail**: README 전체 내용 출력 후 → `install <id>`로 바로 설치 가능함을 안내
- **install**: 설치 완료 후 → Claude Code에서 `/<스킬이름>`으로 즉시 사용 가능함을 안내
