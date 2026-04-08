# 브랜치 생성 및 관리 전략

## 기본 원칙

`main`과 `develop` 브랜치는 보호된 브랜치입니다. 어떤 경우에도 이 브랜치에서 직접 작업하거나 코드를 수정하지 마세요. 모든 작업은 반드시 별도의 feature 브랜치에서 이루어져야 합니다.

## 코드 작업 전 브랜치 확인 (필수)

코드 수정, 파일 편집, 기능 구현, 버그 수정 등 **어떤 코드 작업이든 시작 전에 현재 브랜치를 확인**합니다:

```bash
git branch --show-current
```

현재 브랜치가 `main` 또는 `develop`이면 **코드 작업을 즉시 중단**하고 아래 메시지를 출력합니다:

```
🚫 현재 브랜치: <브랜치명>

main/develop에서는 직접 코드 작업을 할 수 없습니다.
feature 브랜치를 먼저 생성해주세요.

이슈 번호와 작업 설명을 알려주시면 브랜치를 만들어드리겠습니다.
(예: 이슈 42, login-page)
```

`feature/`로 시작하는 브랜치에서만 코드 작업을 진행합니다.

## 브랜치 네이밍 규칙

```
feature/이슈번호-설명
```

예시:
- `feature/42-user-login`
- `feature/101-payment-api`
- `feature/7-fix-null-pointer`

## 브랜치 생성 전 필수 확인

브랜치를 생성하기 전에 반드시 사용자에게 두 가지를 확인하세요:
1. **이슈 번호** (숫자)
2. **설명** (영문 소문자, 하이픈으로 단어 구분)

둘 중 하나라도 없으면 브랜치를 생성하지 말고, 해당 정보를 요청하세요:
> "브랜치를 생성하려면 이슈 번호와 설명이 모두 필요합니다. 이슈 번호와 간단한 설명을 알려주세요. (예: 이슈 42, login-page)"

## 브랜치 파생 규칙

- 모든 신규 브랜치는 **반드시 `main`에서 파생**합니다.
- `develop`에서 브랜치를 따는 것은 금지됩니다.

```bash
git checkout main
git pull origin main
git checkout -b feature/이슈번호-설명
```

## 절대 금지

`develop` 브랜치를 `feature` 브랜치에 merge하는 것은 **절대 금지**입니다.
- 이유: develop의 미완성 코드가 feature 브랜치에 섞여 히스토리가 오염됩니다.
- develop의 변경사항이 필요하다면, 관련 작업자와 협의하여 작업 순서를 조율하세요.

## 브랜치 삭제

`main`에 merge가 완료되면 해당 feature 브랜치는 즉시 삭제합니다:

```bash
git branch -d feature/이슈번호-설명
git push origin --delete feature/이슈번호-설명
```

## 체크리스트

- [ ] 이슈 번호 확인 (없으면 요청)
- [ ] 설명 확인 (없으면 요청)
- [ ] main에서 파생 (`git checkout main && git pull`)
- [ ] `feature/이슈번호-설명` 형식으로 생성
