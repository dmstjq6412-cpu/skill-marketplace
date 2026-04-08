# SonarQube 정적 분석

커밋 전 SonarQube Scanner CLI를 실행해 코드 품질을 검증합니다.
ESLint와 달리 Go, Java, Python 등 멀티언어 프로젝트에 모두 적용됩니다.

## 서버 정보

```
SONAR_HOST=http://<서버주소>:9000
SONAR_TOKEN=<토큰>
```

> 토큰은 SonarQube 웹 UI → My Account → Security → Generate Token 에서 발급

## 사전 조건 확인

```bash
# sonar-scanner 설치 여부 확인
command -v sonar-scanner
```

설치 안 된 경우 → skip (PASS 처리) 후 아래 메시지 출력:
```
⚪ SonarQube skip (sonar-scanner 미설치)
   설치: https://docs.sonarqube.org/7.2/analysis/scan/sonarscanner/
```

`sonar-project.properties` 또는 `-Dsonar.projectKey` 설정이 없는 경우도 skip.

## 실행

```bash
sonar-scanner \
  -Dsonar.projectKey=$(basename $(pwd)) \
  -Dsonar.sources=. \
  -Dsonar.host.url=$SONAR_HOST \
  -Dsonar.login=$SONAR_TOKEN \
  -Dsonar.scm.disabled=true
```

> `sonar-project.properties`가 프로젝트 root에 있으면 `-D` 옵션 생략 가능

## 프로젝트 루트에 두는 설정 파일 (선택)

```properties
# sonar-project.properties
sonar.projectKey=my-project
sonar.projectName=My Project
sonar.sources=.
sonar.exclusions=**/node_modules/**,**/dist/**,**/*_test.go
sonar.host.url=http://<서버주소>:9000
sonar.login=<토큰>
```

## 결과 판정

Scanner 실행 후 SonarQube API로 분석 결과를 조회합니다:

```bash
# 분석 완료 대기 후 Quality Gate 결과 조회
curl -s -u $SONAR_TOKEN: \
  "$SONAR_HOST/api/qualitygates/project_status?projectKey=$(basename $(pwd))"
```

응답의 `projectStatus.status` 기준:

| 값 | 판정 |
|---|---|
| `OK` | PASS |
| `WARN` | PASS (WARNING 출력) |
| `ERROR` | REJECT |
| API 조회 실패 | skip with warning |

## 환경 대응

| 상황 | 처리 |
|---|---|
| sonar-scanner 미설치 | skip (PASS) |
| sonar-project.properties 없고 projectKey 불명 | skip (PASS) |
| 서버 연결 실패 (ECONNREFUSED 등) | skip with warning |
| Quality Gate `ERROR` | REJECT |

## 출력 형식

**REJECT 시:**
```
🔴 SonarQube Quality Gate FAIL (커밋 차단)
- Reliability: 5 Bugs (임계값 초과)
- Security: 2 Vulnerabilities
상세: http://<서버주소>:9000/dashboard?id=<projectKey>
```

**WARNING 시:**
```
🟡 SonarQube Quality Gate WARN (참고용)
- Code Smells: 12개
```

**PASS 시:** 별도 출력 없음

**skip 시:**
```
⚪ SonarQube skip (sonar-scanner 미설치 / 설정 없음 / 서버 연결 실패)
```
