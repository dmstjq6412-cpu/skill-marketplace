# 언어별 코딩 표준

코드 리뷰 시 언어별로 참고하는 안전/위험 패턴입니다.

## Python

```python
# CRITICAL - SQL injection
query = "SELECT * FROM users WHERE name = '" + name + "'"

# CRITICAL - Command injection
os.system("rm " + user_input)
subprocess.call(f"ls {path}", shell=True)  # 변수 포함 시

# CRITICAL - 리소스 누수
conn = psycopg2.connect(dsn)  # try/finally 없음

# 안전
cursor.execute("SELECT * FROM users WHERE name = %s", (name,))
subprocess.run(["ls", path])
with psycopg2.connect(dsn) as conn:
    pass
```

## TypeScript / JavaScript

```typescript
// CRITICAL - XSS
element.innerHTML = userInput;
document.write(req.query.x);

// CRITICAL - SQL injection (Node.js)
db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);

// 안전
element.textContent = userInput;
db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
```

## Go

```go
// CRITICAL - SQL injection
db.Query("SELECT * FROM users WHERE id = " + id)

// CRITICAL - Command injection
exec.Command("sh", "-c", "ls "+userInput)

// 안전
db.Query("SELECT * FROM users WHERE id = ?", id)
exec.Command("ls", userInput)
```

## Java / Kotlin

```java
// CRITICAL - SQL injection
stmt.execute("SELECT * FROM users WHERE id = " + id);

// 안전
PreparedStatement pstmt = conn.prepareStatement("SELECT * FROM users WHERE id = ?");
pstmt.setInt(1, id);
```

## 테스트 파일 완화 기준

아래 경로 패턴이 포함된 파일은 하드코딩 시크릿 검사를 완화합니다:
- `test_`, `_test`, `_spec`, `.test.`, `.spec.`
- `__tests__/`, `tests/`, `spec/`

단, 40자 이상의 랜덤 문자열처럼 보이는 실제 키는 테스트 파일에서도 WARNING 처리합니다.
