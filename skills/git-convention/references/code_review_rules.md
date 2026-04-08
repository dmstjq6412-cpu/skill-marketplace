# 코드 리뷰 규칙

커밋 전 자동 리뷰에 사용되는 기준입니다.
CRITICAL이 하나라도 있으면 REJECT, 없으면 PASS입니다.

---

## CRITICAL 기준 (REJECT 트리거)

### 보안 취약점

| 유형 | 위험 패턴 | 안전한 패턴 |
|------|-----------|-------------|
| 하드코딩 시크릿 | `password = "mypass123"` | `os.getenv("DB_PASSWORD")` |
| SQL injection | `"SELECT * FROM users WHERE id=" + id` | 파라미터 바인딩 사용 |
| XSS | `element.innerHTML = userInput` | `element.textContent = userInput` |
| Command injection | `os.system(f"ls {user_input}")` | `subprocess.run(["ls", user_input])` |
| Path traversal | `open(f"/uploads/{filename}")` | `safe_join()` 또는 경로 검증 |

**하드코딩 시크릿 판별:**
- 변수명에 `password`, `passwd`, `secret`, `key`, `token`, `auth`, `credential` 포함
- 값이 리터럴 문자열 (환경변수/설정파일 참조 아님)
- 테스트 파일(`test_*`, `*_test`, `*_spec`, `*.test.*`)은 제외

### 치명적 버그

- **Null 역참조**: 존재 확인 없이 중첩 프로퍼티 접근 (`user.profile.name`)
- **리소스 누수**: 파일/DB 커넥션을 열고 닫지 않음 (try/finally 또는 with문 없음)
- **무한루프**: 루프 탈출 조건이 없거나 절대 false가 되지 않는 조건

---

## WARNING 기준 (PASS 유지, 정보 제공)

- 에러 핸들링 누락: async/await에서 try-catch 없음
- 매직 넘버: 의미 불명의 숫자 리터럴
- TODO/FIXME: 이슈 번호 없는 주석
- 과도한 함수 길이: 단일 함수에 50줄 이상 추가
- 깊은 중첩: 4단계 이상
- 디버그 코드: `console.log`, `print`, `fmt.Println` 등 프로덕션 코드에 잔존

---

## False Positive 방지

- 환경변수 참조(`os.getenv`, `process.env`)는 시크릿이 아님
- 빈 문자열, `"REPLACE_ME"`, `"your-key-here"` 등 placeholder는 시크릿이 아님
- 테스트 파일의 하드코딩 값은 완화 적용
- `shell=True`여도 하드코딩된 값만 있으면 WARNING (변수 포함 시 CRITICAL)
- **확실하지 않으면 WARNING으로 처리, CRITICAL로 올리지 말 것**

---

## 출력 형식 (반드시 준수)

```
VERDICT: PASS
```

또는

```
VERDICT: REJECT

## CRITICAL
- [파일명:줄번호] 이슈 설명

## WARNINGS (참고용)
- [파일명:줄번호] 경고 내용

## 요약
커밋을 막은 이유를 1-2문장으로 설명.
```

PASS이고 WARNING만 있을 때:

```
VERDICT: PASS

## WARNINGS (참고용)
- [파일명:줄번호] 경고 내용

## 요약
전반적으로 안전합니다.
```
