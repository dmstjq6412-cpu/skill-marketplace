# 프론트엔드 테스트 패턴 (Vitest + @testing-library/react)

## vitest.config 설정 확인

`frontend/vite.config.js` 또는 `vitest.config.js`에서 jsdom 환경이 설정되어 있어야 합니다:

```javascript
test: {
  environment: 'jsdom',
  setupFiles: './src/test-setup.js', // jest-dom 매처 등록
}
```

---

## 모킹 우선순위

1. **API 클라이언트 모킹** (`vi.mock('../api/client', ...)`) — 네트워크 요청 차단
2. **react-router-dom 모킹** — `useParams`, `useNavigate`, `Link`
3. **무거운 서드파티 컴포넌트 모킹** — MarkdownViewer, 차트 라이브러리 등

모킹은 반드시 `await import(...)` 전에 선언해야 합니다.

---

## 컴포넌트 렌더링 패턴

### 기본 렌더링

```javascript
function renderComponent(props = {}) {
  return render(<MyComponent {...props} />);
}
```

### Router가 필요한 컴포넌트

```javascript
import { MemoryRouter } from 'react-router-dom';

function renderWithRouter(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
  );
}
```

### Context가 필요한 컴포넌트

```javascript
function renderWithContext(ui) {
  return render(
    <MyContext.Provider value={mockContextValue}>{ui}</MyContext.Provider>
  );
}
```

---

## 요소 선택 우선순위 (접근성 순)

```javascript
// 1순위: role (접근성)
screen.getByRole('button', { name: /제출/ });
screen.getByRole('heading', { name: /제목/ });

// 2순위: text
screen.getByText('버튼명');

// 3순위: testid (구조적 요소나 data-testid 속성)
screen.getByTestId('skill-card');

// 4순위: placeholder
screen.getByPlaceholderText('검색어를 입력하세요');
```

---

## 비동기 처리 패턴

### waitFor — 상태 변화 기다리기

```javascript
await waitFor(() => {
  expect(screen.getByText('로드 완료')).toBeInTheDocument();
});
```

### findBy — 단일 요소 기다리기 (waitFor 대안)

```javascript
const element = await screen.findByText('로드 완료');
expect(element).toBeInTheDocument();
```

### 에러 케이스

```javascript
it('API 실패 시 에러 메시지 표시', async () => {
  mockFetch.mockRejectedValue(new Error('Network Error'));
  render(<MyComponent />);

  await waitFor(() => {
    expect(screen.getByText(/오류가 발생했습니다/)).toBeInTheDocument();
  });
});
```

---

## 자주 쓰는 jest-dom 매처

```javascript
expect(element).toBeInTheDocument();
expect(element).not.toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toBeDisabled();
expect(element).toHaveTextContent('텍스트');
expect(element).toHaveClass('btn-primary');
expect(element).toHaveValue('input value');
expect(element).toHaveAttribute('href', '/path');
```

---

## 커스텀 훅 단독 테스트

```javascript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from '../hooks/useCounter';

describe('useCounter', () => {
  it('초기값 0', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it('increment 호출 시 1 증가', () => {
    const { result } = renderHook(() => useCounter());
    act(() => result.current.increment());
    expect(result.current.count).toBe(1);
  });
});
```

---

## 스냅샷 테스트

스냅샷은 UI가 안정된 컴포넌트에만 사용하고, 빈번히 바뀌는 컴포넌트에는 피하세요:

```javascript
it('버튼 렌더링 스냅샷', () => {
  const { container } = render(<Button label="클릭" />);
  expect(container).toMatchSnapshot();
});
```
