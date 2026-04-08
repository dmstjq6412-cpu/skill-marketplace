#!/bin/bash
# PreToolUse hook: Edit/Write 실행 전 보호 브랜치 체크
# 현재 git repo 내부 파일에만 적용

input=$(cat)

# node로 file_path 파싱 (backslash → forward slash 정규화)
file_path=$(echo "$input" | node -e "
let d='';
process.stdin.on('data',c=>d+=c).on('end',()=>{
  try {
    const o=JSON.parse(d);
    const p=(o.tool_input&&o.tool_input.file_path)||'';
    process.stdout.write(p.replace(/\\\\/g,'/'));
  } catch(e){ process.stdout.write(''); }
})" 2>/dev/null || echo "")

repo_root=$(git rev-parse --show-toplevel 2>/dev/null | tr '\\' '/' || echo "")

if [ -z "$repo_root" ] || [ -z "$file_path" ]; then
  exit 0
fi

if [[ "$file_path" != "$repo_root"* ]]; then
  exit 0
fi

branch=$(git branch --show-current 2>/dev/null || echo "")

if [ "$branch" = "main" ] || [ "$branch" = "develop" ]; then
  echo "🚫 현재 브랜치: $branch" >&2
  echo "" >&2
  echo "main/develop에서는 직접 파일을 수정할 수 없습니다." >&2
  echo "feature 브랜치를 먼저 생성해주세요." >&2
  echo "" >&2
  echo "이슈 번호와 작업 설명을 알려주시면 브랜치를 만들어드리겠습니다." >&2
  echo "(예: 이슈 42, login-page)" >&2
  exit 2
fi

exit 0
