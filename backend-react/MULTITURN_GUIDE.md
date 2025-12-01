# 멀티턴 대화 가이드

## ✅ 현재 상태

React Agent 백엔드는 **이미 멀티턴 대화를 지원**하고 있습니다!

### 작동 방식

1. **State 관리**
   - `AgentState`는 `add_messages` annotation을 사용하여 메시지를 자동으로 누적합니다
   - 각 턴마다 새로운 메시지가 기존 메시지 리스트에 추가됩니다

2. **Thread-based Persistence**
   - LangGraph API 서버가 자동으로 thread별 상태를 관리합니다
   - 각 thread는 고유한 ID를 가지며, 모든 대화 히스토리를 유지합니다
   - In-memory 모드에서도 서버가 실행되는 동안 상태가 유지됩니다

3. **검증 완료**
   ```bash
   python test_multiturn.py
   ```
   - ✅ 2턴 대화 테스트 통과
   - ✅ Thread에 8개 메시지 저장 (사용자 2개 + AI 2개 + 도구 관련 4개)
   - ✅ 문맥 유지 확인

## 프론트엔드 통합 방법

### 1. Thread 생성 (첫 대화 시작)

```typescript
const client = createLangGraphClient(REACT_AGENT_URL, apiKey);
const thread = await createThread(client);
setCurrentThreadId(thread.thread_id);
```

### 2. 메시지 전송 (각 턴마다)

```typescript
// 첫 번째 턴
const stream1 = streamMessage(
  client,
  threadId,  // 같은 thread ID 사용
  "react_agent",
  "차량 브레이크 문제점 검색해줘",
  messages,  // 기존 메시지 전달
  {}
);

// 두 번째 턴 (같은 thread)
const stream2 = streamMessage(
  client,
  threadId,  // 같은 thread ID 재사용!
  "react_agent",
  "K5의 문제만 자세히 알려줘",  // 이전 문맥을 기억함
  messages,  // 업데이트된 메시지 리스트
  {}
);
```

### 3. 주의사항

**✅ 올바른 사용:**
```typescript
// 새 대화 시작
const newThread = await createThread(client);

// 같은 대화 계속
streamMessage(client, existingThreadId, ...);
```

**❌ 잘못된 사용:**
```typescript
// 매번 새 thread 생성하면 문맥이 끊김
const thread1 = await createThread(client);  // 첫 질문
const thread2 = await createThread(client);  // 두 번째 질문 - 문맥 X
```

## 현재 프론트엔드 구현 확인

`research-agent/app/page.tsx`의 `handleSendMessage` 함수를 확인했을 때:

```typescript
// Create thread if needed
let threadId = currentThreadId;

if (!threadId) {
  const thread = await createThread(client);
  if (!thread) {
    toast.error("Failed to create thread");
    setIsStreaming(false);
    return;
  }
  threadId = thread.thread_id;
  setCurrentThreadId(threadId);  // ✅ Thread ID 저장
}

// Stream response with existing threadId
const stream = streamMessage(
  client,
  threadId,  // ✅ 같은 thread 재사용
  selectedAssistantId,
  content,
  messages,  // ✅ 기존 메시지 전달
  useReactMode ? {} : activeParams,
  abortControllerRef.current?.signal
);
```

**결론: 프론트엔드도 이미 올바르게 구현되어 있습니다!** ✅

## 테스트 방법

### 백엔드 테스트
```bash
cd backend-react
python test_multiturn.py
```

### 프론트엔드 테스트
1. React Mode 활성화
2. 첫 질문: "차량 브레이크 문제점 검색해줘"
3. 두 번째 질문: "K5만 자세히 알려줘"
4. → AI가 이전 대화를 기억하고 K5에 대한 정보만 제공해야 함

## 메시지 구조

각 턴마다 다음과 같은 메시지가 추가됩니다:

```
턴 1:
├── HumanMessage: "차량 브레이크 문제점 검색해줘"
├── AIMessage: "### 🤔 Reasoning\n..." (Reasoning)
├── AIMessage: tool_calls=[...] (도구 호출)
├── ToolMessage: "🔍 검색 결과..." (도구 결과)
└── AIMessage: "### 📊 검색 결과 요약\n..." (최종 답변)

턴 2:
├── HumanMessage: "K5만 자세히 알려줘"
├── AIMessage: "### 🤔 Reasoning\n이전 검색에서..." (이전 문맥 참조)
└── AIMessage: "### 📊 검색 결과 요약\nK5 관련..." (필터링된 답변)
```

## 추가 기능 제안

현재는 In-memory persistence를 사용하므로 서버 재시작 시 대화 히스토리가 사라집니다.

**프로덕션 환경에서는:**
1. PostgreSQL Checkpointer 사용
2. Redis Checkpointer 사용
3. SQLite Checkpointer 사용

하지만 **개발/데모 용도로는 현재 구현으로 충분합니다!** ✅
