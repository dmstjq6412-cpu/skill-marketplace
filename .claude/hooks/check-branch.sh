#!/bin/bash
# PreToolUse hook: Edit/Write 실행 전 보호 브랜치 + 소스코드 디렉토리 체크
#
# 동작 방식: whitelist 기반
# - 아래 PROTECTED_DIRS 안에 있는 파일만 차단
# - 그 외(.harness-lab/, .claude/, *.md 등)는 모두 허용

# ── 보호할 소스코드 디렉토리 (whitelist) ────────────────────────────────
PROTECTED_DIRS=(
  "frontend/src"
  "backend/src"
  "cli/src"
)

input=$(cat)

# ── JSON에서 file_path 추출 ──────────────────────────────────────────────
file_path=""

if [ -z "$file_path" ] && command -v node &>/dev/null; then
  file_path=$(echo "$input" | node -e "
let d='';
process.stdin.on('data',c=>d+=c).on('end',()=>{
  try { const o=JSON.parse(d); process.stdout.write(o.tool_input?.file_path||''); }
  catch { process.stdout.write(''); }
});" 2>/dev/null)
fi

if [ -z "$file_path" ] && command -v python3 &>/dev/null; then
  file_path=$(echo "$input" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(d.get('tool_input',{}).get('file_path',''),end='')
except: pass" 2>/dev/null)
fi

if [ -z "$file_path" ] && command -v python &>/dev/null; then
  file_path=$(echo "$input" | python -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(d.get('tool_input',{}).get('file_path',''),end='')
except: pass" 2>/dev/null)
fi

# Windows Python 자동 탐색 ($HOME 기반)
if [ -z "$file_path" ]; then
  for win_py in \
    "$HOME/AppData/Local/Programs/Python/Python312/python.exe" \
    "$HOME/AppData/Local/Programs/Python/Python311/python.exe" \
    "$HOME/AppData/Local/Programs/Python/Python310/python.exe" \
    "$HOME/AppData/Local/Programs/Python/Python39/python.exe"; do
    if [ -f "$win_py" ]; then
      file_path=$(echo "$input" | "$win_py" -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(d.get('tool_input',{}).get('file_path',''),end='')
except: pass" 2>/dev/null)
      [ -n "$file_path" ] && break
    fi
  done
fi

# ── 현재 브랜치 확인 ────────────────────────────────────────────────────
branch=$(git branch --show-current 2>/dev/null || echo "")
repo_root=$(git rev-parse --show-toplevel 2>/dev/null || echo "")

# 보호 브랜치가 아니면 통과
if [ "$branch" != "main" ] && [ "$branch" != "master" ] && [ "$branch" != "develop" ]; then
  exit 0
fi

# git repo 외부면 통과
if [ -z "$repo_root" ]; then
  exit 0
fi

# file_path 파싱 실패 시 통과 (fail-open: 설정 파일 작업 방해 안 함)
if [ -z "$file_path" ]; then
  exit 0
fi

# ── 경로 정규화 (Windows C:\ ↔ /c/ 모두 대응) ──────────────────────────
normalize() {
  echo "$1" | sed 's|\\|/|g' | sed 's|^[Cc]:/|/c/|' | sed 's|^[Cc]:|/c|'
}

normalized_file=$(normalize "$file_path")
normalized_repo=$(normalize "$repo_root")

# repo 외부 파일이면 통과
if [[ "$normalized_file" != "$normalized_repo"* ]]; then
  exit 0
fi

# ── whitelist 확인: 보호 디렉토리 안에 있는지 체크 ──────────────────────
is_protected=false
for dir in "${PROTECTED_DIRS[@]}"; do
  if [[ "$normalized_file" == "$normalized_repo/$dir"* ]]; then
    is_protected=true
    break
  fi
done

# whitelist 밖이면 통과 (.harness-lab/, .claude/, *.md 등)
if [ "$is_protected" = false ]; then
  exit 0
fi

# ── whitelist 내부 + 보호 브랜치 → 차단 ─────────────────────────────────
echo "🚫 현재 브랜치: $branch" >&2
echo "" >&2
echo "소스코드(frontend/src, backend/src, cli/src)는 main/master/develop에서 직접 수정할 수 없습니다." >&2
echo "feature 브랜치를 먼저 생성해주세요." >&2
echo "" >&2
echo "이슈 번호와 작업 설명을 알려주시면 브랜치를 만들어드리겠습니다." >&2
echo "(예: 이슈 42, login-page)" >&2
exit 2
