# TODO — 논의 필요 사항

> 이 파일은 팀 공유용 메모입니다. Claude가 읽지 않으며 git-convention 동작에 영향을 주지 않습니다.

---

## [ ] main → develop 동기화 타이밍 결정

**배경**
현재 git-convention 스킬은 PR 생성자와 머지하는 사람이 동일하다는 가정 하에 동작합니다.
하지만 실제로는 PR 생성자 ≠ 승인/머지 담당자인 경우가 많아, 아래 타이밍 문제가 있습니다.

```
개발자 (Claude) → PR 생성
        ↓
리뷰어 → 승인
        ↓
누군가 → 머지  ← main→develop sync는 누가, 언제?
```

**선택지**

### A. GitHub Actions 자동화 (CI/CD)
main에 push되는 순간 워크플로우가 자동으로 develop에 sync.
- 장점: 사람 의존 없음, 누락 불가
- 단점: GitHub Actions 설정 필요, 충돌 발생 시 자동 처리 어려움

```yaml
# .github/workflows/sync-develop.yml 예시
on:
  push:
    branches: [main]
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - run: |
          git checkout develop
          git merge --no-ff main -m "sync: main → develop"
          git push origin develop
```

### B. 머지한 사람이 수동으로 트리거
머지 완료 후 Claude에게 "main → develop 동기화해줘" 요청.
- 장점: 기존 수동 프로세스 유지, 추가 인프라 불필요
- 단점: 담당자가 규칙을 알아야 하고 누락 가능성 있음
- 보완: merge.md에 머지 담당자의 sync 책임을 명확히 명시

### C. PR 생성자가 머지 완료 후 모니터링
`gh pr view --json mergedAt`으로 머지 여부 확인 후 sync 실행.
- 장점: PR 생성자가 일관되게 책임
- 단점: 머지 완료 시점을 직접 확인해야 함

**논의 포인트**
- 현재 팀에 GitHub Actions 도입 여부?
- 머지 권한이 누구에게 있는지?
- sync 누락 시 어떻게 감지할 것인지?
