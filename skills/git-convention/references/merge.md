# 머지 전략 및 동기화

## 개발 흐름

```
feature 브랜치 (개발)
    ↓  PR + 리뷰 + 승인 → references/pr.md 참고
  develop (개발환경 테스트)
    ↓  테스트 통과 확인 후
feature 브랜치
    ↓  PR + 리뷰 + 승인 → references/pr.md 참고
   main (운영 반영, feature 브랜치 삭제)
    ↓  즉시 자동
  develop (main sync → 테스트 환경 최신화)
```

**핵심 원칙:** develop → main 이 아닌 **feature → main** 입니다.
- develop은 테스트 전용 환경이며 직접 운영에 반영되지 않습니다.
- main에 머지된 내용만 정확히 운영에 반영됩니다.

## 머지 방식

**Merge commit 방식만 사용합니다.** rebase는 절대 사용하지 마세요.

rebase는 커밋 히스토리를 재작성하여 팀원 간 히스토리 충돌을 유발할 수 있습니다. merge commit은 브랜치 분기와 합류 지점을 명확하게 기록하므로 협업 환경에서 훨씬 안전합니다.

```bash
# 올바른 머지 방법
git merge --no-ff feature/이슈번호-설명

# 절대 사용 금지
git rebase  # ← 금지
```

---

## feature → develop (개발환경 테스트)

feature 브랜치 개발 완료 후 develop으로 PR을 생성합니다. PR 생성 흐름은 `references/pr.md`를 따릅니다.

```bash
gh pr create --base develop --reviewer <리뷰어>
```

develop에서 테스트가 통과되면 feature → main PR로 진행합니다.

---

## feature → main (운영 반영)

develop 테스트 통과 후 **feature 브랜치에서 main으로** PR을 생성합니다. PR 생성 흐름은 `references/pr.md`를 따릅니다.

```bash
gh pr create --base main --reviewer <리뷰어>
```

main에 merge되는 순간 아래 두 작업을 즉시 실행합니다:
1. feature 브랜치 삭제
2. **main → develop 동기화** (아래 참고)

---

## main → develop 동기화 (feature → main 머지 직후 필수)

feature가 main에 머지된 직후 반드시 main을 develop에 동기화합니다. 이렇게 해야 다음 feature의 테스트 환경이 최신 운영 코드를 반영합니다.

```bash
git checkout develop
git merge --no-ff main -m "sync: main → develop after feature/이슈번호-설명 merge"
git push origin develop
```

동기화 없이 방치하면 develop이 main과 점점 달라져 테스트 환경의 신뢰도가 떨어집니다. **main 머지와 develop 동기화는 하나의 작업으로 묶어서 처리하세요.**

---

## 체크리스트

### feature → develop PR
- [ ] 리뷰어 지정 + PR 생성 (`references/pr.md` 흐름 따르기)
- [ ] merge commit 방식 (`--no-ff`)
- [ ] rebase 절대 사용 안 함

### feature → main PR (운영 반영)
- [ ] develop 테스트 통과 확인
- [ ] 리뷰어 지정 + PR 생성 (`references/pr.md` 흐름 따르기)
- [ ] merge commit 방식 (`--no-ff`)
- [ ] rebase 절대 사용 안 함
- [ ] main 머지 완료 즉시 → **main → develop 동기화** 실행
- [ ] feature 브랜치 삭제
