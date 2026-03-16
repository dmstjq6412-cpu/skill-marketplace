---
name: skill-marketplace-cli
description: >
  Skill Marketplace에서 스킬을 탐색·설치·업로드할 때 사용하는 스킬.
  사용자가 "스킬 찾아줘", "마켓에 뭐 있어?", "스킬 설치해줘", "스킬 올려줘", "업데이트 확인해줘"
  처럼 마켓플레이스와 관련된 말을 하면 반드시 이 스킬을 사용할 것.
  자연어 요청을 해석해서 적절한 CLI 명령(list/detail/install/upload/check)으로 변환한다.
argument-hint: [list [-s 검색어] | detail <id> | install <id> | upload <경로> | check]
allowed-tools: Bash
---

Skill Marketplace CLI를 통해 스킬을 탐색하고 설치·업로드합니다.

## 자연어 → 명령 변환 규칙

사용자의 말을 아래 기준으로 해석해서 실행할 명령을 결정합니다.

| 사용자 의도 | 실행 명령 |
|---|---|
| "뭐 있어?", "목록 보여줘", "어떤 스킬 있어?" | `list` |
| "deploy 관련 스킬", "X 스킬 찾아줘" | `list -s <키워드>` |
| "X번 스킬 자세히", "X 스킬 설명 봐줘" | `detail <id>` |
| "X번 설치해줘", "X 스킬 받아줘" | `install <id>` |
| "업데이트 확인", "최신 버전이야?" | `check` |
| "업로드해줘", "마켓에 올려줘" | `upload <경로> -n ... -a ...` |

인자(`$ARGUMENTS`)가 명시된 경우 그대로 사용합니다.

## 실행

### 1. CLI 준비

```bash
SKILL_DIR="$HOME/.claude/skills/skill-marketplace-cli"

if [ ! -d "$SKILL_DIR/node_modules" ]; then
  echo "의존성 설치 중..."
  cd "$SKILL_DIR" && npm install --silent
fi
```

### 2. 명령 실행

```bash
node "$SKILL_DIR/src/index.js" $ARGUMENTS
```

실행이 실패하면 아래 기준으로 대응합니다:
- **ECONNREFUSED / 타임아웃**: Render 서버 웜업 중일 수 있음. 15~30초 후 재시도 안내
- **SKILL.md not found**: 디렉토리 업로드 시 SKILL.md 누락 안내
- **기타 에러**: 에러 메시지 그대로 전달 후 원인 분석

### 3. 결과 해석 및 다음 행동 안내

명령별로 결과 출력 후 아래 안내를 덧붙입니다:

**list 결과 후:**
- 관심있는 스킬이 있으면 `detail <id>`로 README를 확인하거나 `install <id>`로 바로 설치 가능하다고 안내
- 검색 결과가 없으면 다른 키워드 제안

**detail 결과 후:**
- `install <id>`로 설치 가능하다고 안내
- 버전 히스토리가 여러 개면 최신 ID 강조

**install 결과 후:**
- 설치된 경로(`~/.claude/skills/<이름>/`) 안내
- Claude Code에서 `/<스킬이름>`으로 바로 사용 가능하다고 안내

**check 결과 후:**
- outdated 스킬이 있으면 `install <id>`로 업데이트 가능하다고 안내

## 멀티스텝 워크플로우

사용자가 "X 스킬 설치해줘"처럼 이름만 말하고 ID를 모르는 경우:
1. `list -s <키워드>`로 검색
2. 결과를 보여주며 어떤 스킬을 설치할지 확인
3. 확인되면 `install <id>` 실행

"검색해서 바로 설치해줘" 같은 요청이면 목록 확인 후 최신 버전 ID를 자동으로 설치합니다.

## 마켓플레이스 정보

- **API**: `https://skill-marketplace-umzq.onrender.com/api`
- **웹**: `https://skill-marketplace-alpha.vercel.app`
- 환경변수 `SKILL_MARKETPLACE_API`로 서버 변경 가능
