#!/bin/bash
# PostToolUse hook: Edit/Write 후 파일 500줄 초과 시 soft warning

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

[ -z "$file_path" ] && exit 0
[ ! -f "$file_path" ] && exit 0

# ── 라인 수 체크 ─────────────────────────────────────────────────────────
line_count=$(wc -l < "$file_path" 2>/dev/null | tr -d ' ')

if [ "$line_count" -gt 500 ]; then
  echo "⚠️  [파일 크기 경고] $(basename "$file_path"): ${line_count}줄 (500줄 초과)"
  echo "지금 작업 흐름을 먼저 완성하세요. 완성 후 파일 분리 계획을 세우고 사용자에게 보고하세요."
fi

exit 0
