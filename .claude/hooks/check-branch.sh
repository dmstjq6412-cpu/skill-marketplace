#!/bin/bash
# PreToolUse hook: Edit/Write 실행 전 보호 브랜치 체크

input=$(cat)

# ── JSON에서 file_path 추출 (여러 방법 순서대로 시도) ──────────────────
file_path=""

# 방법 1: node (가장 우선)
if [ -z "$file_path" ] && command -v node &>/dev/null; then
  file_path=$(echo "$input" | node -e "
let d='';
process.stdin.on('data',c=>d+=c).on('end',()=>{
  try { const o=JSON.parse(d); process.stdout.write(o.tool_input?.file_path||''); }
  catch { process.stdout.write(''); }
});" 2>/dev/null)
fi

# 방법 2: python3
if [ -z "$file_path" ] && command -v python3 &>/dev/null; then
  file_path=$(echo "$input" | python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(d.get('tool_input',{}).get('file_path',''),end='')
except: pass" 2>/dev/null)
fi

# 방법 3: python
if [ -z "$file_path" ] && command -v python &>/dev/null; then
  file_path=$(echo "$input" | python -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(d.get('tool_input',{}).get('file_path',''),end='')
except: pass" 2>/dev/null)
fi

# 방법 4: 전체 경로 Python (Windows 전용)
if [ -z "$file_path" ]; then
  PYTHON_WIN="/c/Users/임은섭/AppData/Local/Programs/Python/Python312/python.exe"
  if [ -f "$PYTHON_WIN" ]; then
    file_path=$(echo "$input" | "$PYTHON_WIN" -c "
import sys,json
try:
    d=json.load(sys.stdin)
    print(d.get('tool_input',{}).get('file_path',''),end='')
except: pass" 2>/dev/null)
  fi
fi

# ── 현재 브랜치 확인 ────────────────────────────────────────────────────
branch=$(git branch --show-current 2>/dev/null || echo "")
repo_root=$(git rev-parse --show-toplevel 2>/dev/null || echo "")

# 보호 브랜치가 아니면 통과
if [ "$branch" != "main" ] && [ "$branch" != "develop" ]; then
  exit 0
fi

# git repo 외부면 통과
if [ -z "$repo_root" ]; then
  exit 0
fi

# file_path 파싱 실패 시 → fail-safe: 보호 브랜치면 차단
if [ -z "$file_path" ]; then
  echo "🚫 현재 브랜치: $branch" >&2
  echo "" >&2
  echo "main/develop에서는 직접 파일을 수정할 수 없습니다." >&2
  echo "feature 브랜치를 먼저 생성해주세요." >&2
  echo "" >&2
  echo "이슈 번호와 작업 설명을 알려주시면 브랜치를 만들어드리겠습니다." >&2
  echo "(예: 이슈 42, login-page)" >&2
  exit 2
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

# ── repo 내부 파일 + 보호 브랜치 → 차단 ────────────────────────────────
echo "🚫 현재 브랜치: $branch" >&2
echo "" >&2
echo "main/develop에서는 직접 파일을 수정할 수 없습니다." >&2
echo "feature 브랜치를 먼저 생성해주세요." >&2
echo "" >&2
echo "이슈 번호와 작업 설명을 알려주시면 브랜치를 만들어드리겠습니다." >&2
echo "(예: 이슈 42, login-page)" >&2
exit 2
