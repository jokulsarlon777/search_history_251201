# 🚀 Quick Start Guide

Backend-React를 빠르게 시작하는 가이드입니다.

## 1. 사전 준비

### 필수 요구사항
- Python 3.9 이상
- Elasticsearch 8.x (실행 중이어야 함)
- OpenAI API 키

### Elasticsearch 실행 확인

```bash
curl http://localhost:9200
```

정상적으로 실행 중이면 JSON 응답이 반환됩니다.

## 2. 설치

### 자동 설치 (추천)

```bash
cd backend-react
bash setup.sh
```

### 수동 설치

```bash
# 가상환경 생성
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 API 키 입력
```

## 3. 환경 변수 설정

`.env` 파일 수정:

```bash
# 필수: OpenAI API 키
OPENAI_API_KEY=sk-your-openai-api-key

# Elasticsearch 설정 (기본값 사용 가능)
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your-password
```

## 4. 서버 실행

### LangGraph 개발 서버

```bash
langgraph dev
```

서버가 `http://localhost:2024`에서 실행됩니다.

### 서버 확인

다른 터미널에서:

```bash
curl http://localhost:2024/ok
```

## 5. 테스트

### Python 스크립트로 테스트

```bash
python test_agent.py
```

### HTTP API로 테스트

```bash
curl -X POST http://localhost:2024/runs/stream \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": "react_agent",
    "input": {
      "messages": [
        {"role": "user", "content": "사용 가능한 인덱스를 보여줘"}
      ]
    },
    "stream_mode": ["messages", "updates"]
  }'
```

## 6. 프론트엔드 연결

프론트엔드(research-agent)에서 사용:

```typescript
// .env.local에 추가
NEXT_PUBLIC_LANGGRAPH_URL=http://localhost:2024
NEXT_PUBLIC_REACT_ASSISTANT_ID=react_agent
```

## 문제 해결

### Elasticsearch 연결 오류

```bash
# Elasticsearch 상태 확인
curl http://localhost:9200/_cluster/health

# 인덱스 확인
curl http://localhost:9200/_cat/indices?v
```

### LangGraph 서버 오류

```bash
# 로그 확인
langgraph dev --verbose

# 포트 변경
langgraph dev --port 8080
```

### Python 패키지 오류

```bash
# 가상환경 재생성
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 다음 단계

1. ✅ Elasticsearch에 샘플 데이터 추가
2. ✅ 프론트엔드와 연동
3. ✅ 도구 커스터마이징
4. ✅ 프롬프트 튜닝
