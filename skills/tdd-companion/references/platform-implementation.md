# 플랫폼별 구현 가이드

---

## Codex

```js
// Step 1: 스코프 판단 (git diff --stat 파싱)
const diffStat = await run_command("git diff --stat HEAD");
const totalChangedLines = diffStat
  .split("\n")
  .slice(0, -1) // 마지막 summary 줄 제외
  .reduce((sum, line) => {
    const match = line.match(/(\d+) insertion|(\d+) deletion/g);
    return sum + (match ? match.reduce((s, m) => s + parseInt(m), 0) : 0);
  }, 0);

const isSingleMode = changedFiles.length < 10 && totalChangedLines < 300;

// Step 2: 프레임워크 감지
const pkgJson = JSON.parse(await read_file("package.json"));
const deps = { ...pkgJson.devDependencies, ...pkgJson.dependencies };
const testFramework = deps.vitest
  ? { runner: "vitest", mockLib: "vi.mock / vi.fn()", clearMocks: "vi.clearAllMocks()" }
  : deps.jest
  ? { runner: "jest", mockLib: "jest.mock / jest.fn()", clearMocks: "jest.clearAllMocks()" }
  : { runner: "unknown", mockLib: "unknown", clearMocks: "unknown" };

// Step 3: 테스트 경로 계산
const changedSourceFiles = changedFiles.map((f) => ({
  ...f,
  expectedTestPath: resolveTestPath(f.path),
}));

// Step 4: 제품 코드 작성
if (isSingleMode) {
  // 메인 에이전트가 직접 작성
} else {
  // 레이어 그룹핑
  const LAYER_KEYWORDS = [
    { layer: 0, keywords: ["types/", "interfaces/", "models/", "entities/", "schema/"] },
    { layer: 1, keywords: ["utils/", "helpers/", "lib/", "constants/", "config/"] },
    { layer: 2, keywords: ["repositories/", "dao/", "store/", "db/"] },
    { layer: 3, keywords: ["services/", "usecases/", "domain/"] },
    { layer: 4, keywords: ["controllers/", "routes/", "handlers/", "api/", "middleware/"] },
    { layer: 5, keywords: ["components/", "hooks/", "pages/", "views/", "screens/"] },
  ];

  const resolveLayer = (filePath) => {
    const segments = filePath.split("/");
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i] + "/";
      for (const { layer, keywords } of LAYER_KEYWORDS) {
        if (keywords.some((k) => segment.startsWith(k))) return layer;
      }
    }
    return 3; // 기본값: Business Logic
  };

  const grouped = changedFiles.reduce((acc, f) => {
    const layer = resolveLayer(f.path);
    (acc[layer] = acc[layer] || []).push(f);
    return acc;
  }, {});

  // 레이어 순 순차 실행 (같은 레이어 내 병렬)
  for (const layer of [0, 1, 2, 3, 4, 5]) {
    if (!grouped[layer]) continue;
    await Promise.all(
      grouped[layer].map((file) =>
        spawn_agent({
          agent_type: "worker",
          fork_context: true,
          message: `... Sequential Code Writer 템플릿 (대상: ${file.path}) ...`,
        })
      )
    );
  }
}

// Step 5: 병렬 위임 (Phase 1)
const [analyzer, ...unitWorkers] = await Promise.all([
  spawn_agent({
    agent_type: "explorer",
    fork_context: true,
    message: `... Impact Analyzer 템플릿 ...`,
  }),
  ...changedSourceFiles.map((file) =>
    spawn_agent({
      agent_type: "worker",
      fork_context: true,
      message: `... Unit Test Worker 템플릿 (대상: ${file.path}, 경로: ${file.expectedTestPath}, 프레임워크: ${testFramework.runner}) ...`,
    })
  ),
]);

// Step 6: Phase 2
const analyzerResult = await wait_agent({ targets: [analyzer.id], timeout_ms: 300000 });
let affectedFlows;
try {
  affectedFlows = JSON.parse(analyzerResult.output).affected_flows;
} catch {
  affectedFlows = null;
}

if (affectedFlows && affectedFlows.length > 0) {
  await spawn_agent({
    agent_type: "worker",
    fork_context: true,
    message: `... Regression Writer 템플릿 (흐름: ${analyzerResult.output}) ...`,
  });
}
```

---

## Claude

```
[준비]
1. `git diff --stat HEAD` 실행 → 변경 파일 수 + 총 변경 라인 수 확인
   - 파일 < 10 AND 변경 라인 < 300 → 단일 모드
   - 파일 ≥ 10 OR 변경 라인 ≥ 300 → 멀티 모드
2. package.json 읽어 테스트 프레임워크 감지
3. 변경 파일별 예상 테스트 경로 계산

[제품 코드 작성]
- 단일 모드 (< 10개): 메인 에이전트가 직접 작성
- 멀티 모드 (≥ 10개): 각 파일에 레이어 번호 부여 → Layer 0부터 순차 실행
  - 같은 레이어 파일은 Sequential Code Writer에 병렬 위임
  - 앞 레이어 완료 확인 후 다음 레이어 실행

[Phase 1 - 병렬 위임]
- 변경 파일마다 Unit Test Worker 1개씩
- 동시에 Impact Analyzer 1개

[Phase 2 - 조건부]
- affected_flows가 있으면 → Regression Writer
- 비어있거나 파싱 실패면 → 생략

[완료]
- 결과 검토, 테스트 이름·mock 정리, 기존 테스트 충돌 여부 확인
```
