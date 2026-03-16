---
name: skill-marketplace-cli
description: Skill Marketplace CLI - 스킬 탐색, 설치, 업로드 도구
argument-hint: [list|detail|install|upload|check]
allowed-tools: Bash
---

Skill Marketplace CLI를 사용하여 스킬을 탐색하고 설치합니다.

## 설치 방법

아래 명령어로 CLI를 설치합니다:

```bash
cd ~/.claude/skills/skill-marketplace-cli && npm install
```

## 사용법

인자: `$ARGUMENTS`

| 명령어 | 설명 |
|---|---|
| `list` | 마켓플레이스 스킬 목록 조회 |
| `list -s <검색어>` | 스킬 이름으로 검색 |
| `detail <id>` | 특정 스킬 상세 정보 조회 |
| `install <id>` | 스킬 설치 (`~/.claude/skills/`) |
| `upload <파일/.md/.zip>` | 스킬 업로드 |
| `check` | 설치된 스킬 업데이트 확인 |

## 실행

```bash
SKILL_DIR="$HOME/.claude/skills/skill-marketplace-cli"

if [ ! -d "$SKILL_DIR/node_modules" ]; then
  echo "CLI 의존성 설치 중..."
  cd "$SKILL_DIR" && npm install
fi

node "$SKILL_DIR/src/index.js" $ARGUMENTS
```

실행 결과를 사용자에게 그대로 전달합니다.
