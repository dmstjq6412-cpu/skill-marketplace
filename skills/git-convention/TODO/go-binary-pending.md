# [보류] Go 바이너리 전환

## 목적

`scripts/git-platform.js` (Node.js)를 Go 컴파일 바이너리로 교체하여 보안 강화.
토큰 처리 코드가 컴파일되어 소스가 노출되지 않는 이점.

## 소스 위치

```
scripts/git-platform-go/
├── main.go     # Gitea/GitHub/GitLab PR 생성 전체 로직
└── go.mod      # module git-platform
```

## 컴파일 방법 (해결 후 실행)

```bash
cd ~/.claude/skills/git-convention/scripts/git-platform-go
go build -o ../git-platform.exe .
```

## 전환 절차

1. 위 명령으로 `scripts/git-platform.exe` 빌드
2. `references/pr-gitea.md`의 실행 명령 교체:
   - 변경 전: `node "$SKILL_DIR/scripts/git-platform.js" pr create ...`
   - 변경 후: `"$SKILL_DIR/scripts/git-platform.exe" pr create ...`
3. `scripts/git-platform.js` 제거 또는 fallback으로 유지

## 보류 이유

Windows 환경에서 `go build` 실행 시 temp 디렉토리 권한 오류:

```
Access is denied
C:\Users\...\AppData\Local\Temp\go-buildXXX\b001\exe\a.out.exe
```

시도한 우회 방법:
- `GOTMPDIR=$HOME/gotmp` 설정 → 동일 오류
- 출력 경로 변경 → 동일 오류

## 재시도 시 확인사항

- Go 설치 경로 및 버전 확인: `go version`
- temp 디렉토리 권한 확인: `ls -la $TEMP`
- 바이러스 백신이 temp exe 생성을 차단하는지 확인 (가장 유력한 원인)
- 관리자 권한으로 재시도
