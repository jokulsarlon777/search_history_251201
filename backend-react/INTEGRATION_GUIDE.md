# 프론트엔드 통합 가이드

Backend-React 에이전트를 research-agent 프론트엔드와 통합하는 방법입니다.

## ✅ 완료된 작업

### 1. 백엔드 서버 설정

**LangSmith Tracing 비활성화**
```bash
# backend-react/.env
LANGCHAIN_TRACING_V2=false
```

LangSmith를 사용하고 싶다면:
```bash
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your-api-key
LANGCHAIN_PROJECT=backend-react
```

### 2. 프론트엔드 환경 변수

**research-agent/.env.local**에 추가됨:
```bash
# React Agent (기본 모드 - 빠른 응답)
NEXT_PUBLIC_REACT_AGENT_URL=http://127.0.0.1:2025
NEXT_PUBLIC_REACT_ASSISTANT_ID=react_agent

# Deep Research Agent (심층 분석 모드)
NEXT_PUBLIC_LANGGRAPH_URL=http://127.0.0.1:2024
NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID=Deep Researcher
```

### 3. Zustand Store 업데이트

**store/app-store.ts**에 추가됨:
- `useReactMode: boolean` - Deep Research 모드 상태
- `setUseReactMode()` - Deep Research 모드 토글
- 상호 배타적 로직: Deep Research ON → Quick OFF, Quick ON → Deep Research OFF

### 4. UI 버튼 추가

**components/chat-input.tsx**에 Deep Research Mode 버튼 추가됨:
- Quick Mode 옆에 위치
- Blue-Purple 그라데이션
- Search 아이콘
- 애니메이션 효과

### 5. 메시지 전송 로직 통합

**app/page.tsx**의 `handleSendMessage` 함수 수정됨:

```typescript
// 모드에 따른 API URL 선택
const REACT_AGENT_URL = process.env.NEXT_PUBLIC_REACT_AGENT_URL || "http://127.0.0.1:2025";
const REACT_ASSISTANT_ID = process.env.NEXT_PUBLIC_REACT_ASSISTANT_ID || "react_agent";

// useReactMode가 true면 Deep Research, false면 React Agent (기본값)
const selectedApiUrl = useReactMode ? (apiUrl || LANGGRAPH_API_URL) : REACT_AGENT_URL;
const selectedAssistantId = useReactMode ? (assistantId || LANGGRAPH_ASSISTANT_ID) : REACT_ASSISTANT_ID;

// 적절한 클라이언트 생성
const client = createLangGraphClient(selectedApiUrl, apiKey);

// 스트리밍 시작
const stream = streamMessage(
  client,
  threadId,
  selectedAssistantId,
  content,
  messages,
  useReactMode ? activeParams : {}, // Deep Research 모드일 때만 파라미터 전달
  abortControllerRef.current?.signal
);
```

---

## 🚀 사용 방법

### 1. 백엔드 서버 실행

```bash
# Deep Research Agent (포트 2024)
cd deep-research-backend
langgraph dev

# React Agent (포트 2025)
cd backend-react
langgraph dev --port 2025
```

### 2. 프론트엔드 실행

```bash
cd research-agent
npm run dev
```

### 3. 모드 선택

- **모든 버튼 OFF (기본값)** → React Agent (빠른 Elasticsearch 검색, 캐싱 지원)
- **Quick 버튼 ON** → Deep Research Quick (빠른 파라미터)
- **Deep Research 버튼 ON** → Deep Research (전체 리서치)

---

## 🎯 모드별 동작

### React Agent (기본 모드)
- **활성화:** 모든 버튼 OFF
- **서버:** `http://localhost:2025`
- **Assistant:** `react_agent`
- **특징:**
  - Elasticsearch 기반 빠른 검색
  - ReAct 에이전트 사용
  - 도구 사용 시각화
  - **응답 캐싱 (1시간 TTL)**
  - 단계별 진행 상황 표시
- **파라미터:** 없음 (간단한 검색)

### Quick Mode
- **활성화:** Quick 버튼 ON
- **서버:** `http://localhost:2024`
- **Assistant:** `Deep Researcher`
- **특징:**
  - Deep Research의 빠른 버전
  - 제한된 반복
  - 캐싱 없음
- **파라미터:**
  - max_researcher_iterations: 1
  - allow_clarification: false
  - max_concurrent_research_units: 5

### Deep Research Mode
- **활성화:** Deep Research 버튼 ON
- **서버:** `http://localhost:2024`
- **Assistant:** `Deep Researcher`
- **특징:**
  - 심층 리서치
  - 웹 검색
  - 상세한 답변
  - 캐싱 없음
- **파라미터:**
  - max_researcher_iterations: 10
  - allow_clarification: true
  - max_concurrent_research_units: 5

---

## 🔧 디버깅

### 콘솔 로그 확인

```typescript
console.log("🎯 Mode Selection:", {
  useReactMode,  // true = Deep Research, false = React Agent (기본)
  useQuickMode,  // true = Quick Mode
  selectedApiUrl,
  selectedAssistantId,
});
```

### 서버 상태 확인

```bash
# Deep Research
curl http://localhost:2024/ok

# React Agent
curl http://localhost:2025/ok
```

### 도구 실행 확인

React Agent 모드 (기본값)에서는 도구 사용이 표시됩니다:
```
🤔 Thinking
🔧 도구 사용: elasticsearch_search
✅ 도구 실행 완료
📝 답변 작성
```

---

## 📊 비교

| 특징 | React Agent (기본) | Quick Mode | Deep Research |
|------|--------------------|------------|---------------|
| 활성화 | 모든 버튼 OFF | Quick ON | Deep Research ON |
| 속도 | 빠름 | 중간 | 느림 |
| 깊이 | 얕음 | 보통 | 깊음 |
| 도구 | Elasticsearch | 웹 검색 | 웹 검색 |
| 캐싱 | ✅ (1시간) | ❌ | ❌ |
| 진행 표시 | ✅ | ❌ | ❌ |
| 사용 사례 | 내부 검색, 빠른 답변 | 간단한 질문 | 복잡한 주제 |

---

## 🐛 문제 해결

### React Agent 서버가 시작되지 않음

```bash
cd backend-react
pip install -U "langgraph-cli[inmem]"
langgraph dev --port 2025
```

### Elasticsearch 연결 실패

```bash
# Elasticsearch 실행 확인
curl http://localhost:9200

# 샘플 데이터 추가
python sample_data.py
```

### 프론트엔드에서 연결 실패

1. `.env.local` 파일 확인
2. 서버 포트 확인 (2024, 2025)
3. CORS 설정 확인

---

## 다음 단계

- [ ] React Mode에서 진행 상태 표시 개선
- [ ] Elasticsearch 인덱스 커스터마이징
- [ ] 도구 추가 (예: 데이터베이스 검색, API 호출)
- [ ] 프로덕션 배포 설정
