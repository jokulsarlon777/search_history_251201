# Backend-React

LangGraph 기반 ReAct 에이전트 - Elasticsearch 검색을 활용한 빠르고 간단한 답변 제공

## 특징

- **LangGraph**: 에이전트 워크플로우 관리
- **ReAct 패턴**: Reasoning + Acting
- **Elasticsearch**: 내부 데이터베이스 검색 도구
- **스트리밍 응답**: 실시간 응답 전달
- **간단하고 빠름**: 기본 모드로 사용
- **응답 캐싱**: 프론트엔드에서 1시간 TTL 캐싱 지원
- **단계별 진행**: Thinking → Tool 사용 → 답변 작성

## 아키텍처

```
ReAct Agent Flow:
User Question → Reasoning → Tool Selection → Elasticsearch Search → Answer Generation
```

## 시작하기

### 1. 환경 변수 설정

`.env` 파일 생성:

```bash
# OpenAI API
OPENAI_API_KEY=your-openai-api-key

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your-password

# LangGraph Server (optional)
LANGCHAIN_API_KEY=your-langchain-api-key
```

### 2. 의존성 설치

```bash
pip install -r requirements.txt
```

### 3. LangGraph 서버 실행

```bash
langgraph dev
```

서버가 `http://localhost:2024`에서 실행됩니다.

## 사용법

### HTTP API로 호출

```bash
curl -X POST http://localhost:2024/runs/stream \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": "react-agent",
    "input": {
      "messages": [
        {"role": "user", "content": "What is LangGraph?"}
      ]
    },
    "stream_mode": ["messages", "updates"]
  }'
```

### Python SDK로 호출

```python
from langgraph_sdk import get_client

client = get_client(url="http://localhost:2024")

async for chunk in client.runs.stream(
    thread_id=None,
    assistant_id="react-agent",
    input={"messages": [{"role": "user", "content": "검색 쿼리"}]},
    stream_mode=["messages", "updates"]
):
    print(chunk)
```
