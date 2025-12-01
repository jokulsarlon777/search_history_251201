# 사내 환경 배포 가이드

이 문서는 React Agent 시스템을 사내 환경에 배포하기 위한 전체 가이드입니다.

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [프로젝트 구조](#프로젝트-구조)
3. [환경별 구성 요소](#환경별-구성-요소)
4. [환경 변수 설정](#환경-변수-설정)
5. [Elasticsearch 인덱스 설정](#elasticsearch-인덱스-설정)
6. [LLM 제공자 변경](#llm-제공자-변경)
7. [사내 환경 배포 절차](#사내-환경-배포-절차)
8. [트러블슈팅](#트러블슈팅)

---

## 시스템 개요

### 전체 아키텍처

```
┌─────────────────┐
│  웹 프론트엔드   │  (Next.js)
│ research-agent  │  - 사용자 UI
└────────┬────────┘  - LangGraph SDK 클라이언트
         │
         ├─────────────┬──────────────┐
         │             │              │
┌────────▼────────┐   │         ┌────▼────────┐
│ Deep Research   │   │         │ React Agent │
│  (Port 2024)    │   │         │ (Port 2025) │
│                 │   │         │             │
│ 사내 API로      │   │         │ ✅ 그대로    │
│ 대체 필요 ⚠️     │   │         │   활용      │
└─────────────────┘   │         └─────┬───────┘
                      │               │
                      │         ┌─────▼──────────┐
                      │         │ Elasticsearch  │
                      │         │ (Port 9200)    │
                      │         │                │
                      │         │ 사내 ES로      │
                      │         │ 대체 필요 ⚠️    │
                      │         └────────────────┘
                      │
                ┌─────▼──────┐
                │ OpenAI API │
                │            │
                │ 사내 LLM으로│
                │ 대체 가능 ⚠️ │
                └────────────┘
```

### 구성 요소 분류

#### ✅ 그대로 활용 가능
- 웹 프론트엔드 (`/research-agent`)
- React Agent 백엔드 코드 (`/backend-react`)
- LangGraph 에이전트 로직

#### ⚠️ 사내 환경으로 대체 필요
1. **Deep Research API** (127.0.0.1:2024)
2. **Elasticsearch** (localhost:9200)
3. **OpenAI API** (선택적)

---

## 프로젝트 구조

```
backend-react/
├── config/
│   └── es_indices.json          # 인덱스 설정 (사내 환경에 맞춰 수정)
├── agent/
│   ├── react_agent.py           # ReAct 에이전트 (그대로 사용)
│   └── state.py                 # 상태 관리
├── tools/
│   └── elasticsearch_tool.py    # ES 검색 도구 (설정 기반)
├── .env                         # 환경 변수 (사내 환경에 맞춰 수정)
├── .env.example                 # 환경 변수 예제
└── langgraph.json              # LangGraph 설정

research-agent/
├── app/
│   └── page.tsx                 # 메인 페이지
├── components/                  # UI 컴포넌트
├── lib/
│   └── langgraph.ts            # LangGraph 클라이언트
└── .env.local                   # 프론트엔드 환경 변수
```

---

## 환경별 구성 요소

### 1. 프론트엔드 환경 변수 (`research-agent/.env.local`)

```env
# Deep Research Agent (사내 API로 대체)
NEXT_PUBLIC_LANGGRAPH_URL=http://127.0.0.1:2024
NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID=Deep Researcher
NEXT_PUBLIC_LANGGRAPH_API_KEY=

# React Agent (그대로 사용)
NEXT_PUBLIC_REACT_AGENT_URL=http://127.0.0.1:2025
NEXT_PUBLIC_REACT_ASSISTANT_ID=react_agent
```

**사내 환경 변경 예시:**
```env
# Deep Research Agent (사내 API)
NEXT_PUBLIC_LANGGRAPH_URL=https://internal-research.company.com
NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID=Deep Researcher
NEXT_PUBLIC_LANGGRAPH_API_KEY=your-internal-api-key

# React Agent (사내 서버)
NEXT_PUBLIC_REACT_AGENT_URL=https://react-agent.company.com
NEXT_PUBLIC_REACT_ASSISTANT_ID=react_agent
```

### 2. 백엔드 환경 변수 (`backend-react/.env`)

```env
# OpenAI API (사내 LLM으로 대체 가능)
OPENAI_API_KEY=sk-proj-...

# Elasticsearch Configuration (사내 ES로 대체)
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=

# Elasticsearch Index Configuration (사내 인덱스 설정)
ES_DEFAULT_INDEX=documents
ES_INDEX_CONFIG_FILE=config/es_indices.json

# Optional: LangSmith Tracing
LANGCHAIN_TRACING_V2=false
```

---

## 환경 변수 설정

### 필수 환경 변수

| 변수명 | 설명 | 기본값 | 사내 환경 예시 |
|--------|------|--------|---------------|
| `ELASTICSEARCH_URL` | Elasticsearch 서버 주소 | `http://localhost:9200` | `https://es-cluster.company.com:9200` |
| `ELASTICSEARCH_USERNAME` | ES 사용자명 | `elastic` | `service_account` |
| `ELASTICSEARCH_PASSWORD` | ES 비밀번호 | (비어있음) | `your-password` |
| `ES_DEFAULT_INDEX` | 기본 검색 인덱스 | `documents` | `company_docs` |
| `ES_INDEX_CONFIG_FILE` | 인덱스 설정 파일 경로 | `config/es_indices.json` | `config/company_indices.json` |
| `OPENAI_API_KEY` | OpenAI API 키 | - | (Azure/사내 LLM 사용 시 불필요) |

### 선택적 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `LANGCHAIN_TRACING_V2` | LangSmith 트레이싱 활성화 | `false` |
| `LANGCHAIN_API_KEY` | LangSmith API 키 | - |
| `LANGCHAIN_PROJECT` | LangSmith 프로젝트명 | `backend-react` |

---

## Elasticsearch 인덱스 설정

### 설정 파일 구조 (`config/es_indices.json`)

```json
{
  "인덱스_이름": {
    "display_name": "표시 이름",
    "description": "인덱스 설명",
    "search_fields": ["검색할_필드^가중치", "다른_필드"],
    "source_fields": ["반환할_필드1", "필드2", "필드3"],
    "result_format": {
      "type": "document | vehicle",
      "title_field": "제목_필드",
      "content_field": "내용_필드",
      "url_field": "URL_필드"
    }
  }
}
```

### 예시 1: 기본 문서 인덱스

```json
{
  "technical_docs": {
    "display_name": "기술 문서",
    "description": "사내 기술 문서 및 매뉴얼",
    "search_fields": [
      "title^3",
      "content^2",
      "tags",
      "author"
    ],
    "source_fields": [
      "title",
      "content",
      "url",
      "timestamp",
      "author",
      "department"
    ],
    "result_format": {
      "type": "document",
      "title_field": "title",
      "content_field": "content",
      "url_field": "url"
    }
  }
}
```

### 예시 2: 차량 이슈 인덱스 (현재 설정)

```json
{
  "vehicle_issues": {
    "display_name": "차량 이슈",
    "description": "차량 관련 문제점, 현상, 원인 및 대책 정보",
    "search_fields": [
      "시스템^3",
      "문제점내용^2",
      "현상",
      "원인및요구안내용",
      "대책조치",
      "차종"
    ],
    "source_fields": [
      "순번",
      "차종",
      "단계",
      "시스템",
      "문제점내용",
      "현상",
      "원인및요구안내용",
      "대책조치"
    ],
    "result_format": {
      "type": "vehicle",
      "title_fields": ["차종", "시스템"],
      "content_fields": {
        "문제": "문제점내용",
        "현상": "현상",
        "원인": "원인및요구안내용",
        "대책": "대책조치",
        "단계": "단계"
      }
    }
  }
}
```

### 새 인덱스 추가 방법

1. `config/es_indices.json` 파일 열기
2. 새 인덱스 설정 추가
3. 서버 재시작 (자동 로드됨)

**예시:**
```json
{
  "vehicle_issues": { ... },
  "documents": { ... },
  "company_knowledge": {
    "display_name": "회사 지식베이스",
    "description": "사내 위키 및 지식 문서",
    "search_fields": ["title^2", "content", "category"],
    "source_fields": ["title", "content", "url", "category"],
    "result_format": {
      "type": "document",
      "title_field": "title",
      "content_field": "content",
      "url_field": "url"
    }
  }
}
```

---

## LLM 제공자 변경

### 현재 설정 (OpenAI)

**파일:** `agent/react_agent.py:130-134`

```python
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0,
    streaming=True,
)
```

### 옵션 1: Azure OpenAI로 변경

**필요한 패키지:**
```bash
pip install langchain-openai
```

**코드 수정:**
```python
from langchain_openai import AzureChatOpenAI

llm = AzureChatOpenAI(
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    azure_deployment=os.getenv("AZURE_DEPLOYMENT_NAME"),
    api_version=os.getenv("AZURE_API_VERSION", "2024-02-15-preview"),
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    temperature=0,
    streaming=True,
)
```

**환경 변수 추가 (`.env`):**
```env
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_DEPLOYMENT_NAME=gpt-4o-mini
AZURE_API_VERSION=2024-02-15-preview
AZURE_OPENAI_API_KEY=your-azure-key
```

### 옵션 2: 사내 LLM 서버로 변경

**OpenAI 호환 API를 제공하는 경우:**
```python
llm = ChatOpenAI(
    base_url=os.getenv("INTERNAL_LLM_URL", "https://llm.company.com/v1"),
    api_key=os.getenv("INTERNAL_LLM_API_KEY"),
    model=os.getenv("INTERNAL_LLM_MODEL", "company-gpt-4"),
    temperature=0,
    streaming=True,
)
```

**환경 변수 추가 (`.env`):**
```env
INTERNAL_LLM_URL=https://llm.company.com/v1
INTERNAL_LLM_API_KEY=your-internal-key
INTERNAL_LLM_MODEL=company-gpt-4
```

### 옵션 3: 다른 LLM 제공자

**Anthropic (Claude):**
```python
from langchain_anthropic import ChatAnthropic

llm = ChatAnthropic(
    model="claude-3-sonnet-20240229",
    anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
    temperature=0,
    streaming=True,
)
```

**Google (Gemini):**
```python
from langchain_google_genai import ChatGoogleGenerativeAI

llm = ChatGoogleGenerativeAI(
    model="gemini-pro",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0,
    streaming=True,
)
```

---

## 사내 환경 배포 절차

### 1단계: 환경 변수 설정

#### 프론트엔드 설정
```bash
cd research-agent
cp .env.local .env.local.backup
nano .env.local  # 또는 vi, vim 등
```

**수정 내용:**
```env
NEXT_PUBLIC_LANGGRAPH_URL=https://internal-research.company.com
NEXT_PUBLIC_REACT_AGENT_URL=https://react-agent.company.com
```

#### 백엔드 설정
```bash
cd backend-react
cp .env .env.backup
nano .env
```

**수정 내용:**
```env
# Elasticsearch
ELASTICSEARCH_URL=https://es-cluster.company.com:9200
ELASTICSEARCH_USERNAME=service_account
ELASTICSEARCH_PASSWORD=your-secure-password

# Index Configuration
ES_DEFAULT_INDEX=company_docs
ES_INDEX_CONFIG_FILE=config/company_indices.json

# LLM (필요시)
AZURE_OPENAI_ENDPOINT=https://company-openai.openai.azure.com
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_DEPLOYMENT_NAME=gpt-4o-mini
```

### 2단계: 인덱스 설정 작성

```bash
cd backend-react/config
cp es_indices.json company_indices.json
nano company_indices.json
```

**사내 인덱스에 맞게 수정:**
```json
{
  "company_docs": {
    "display_name": "회사 문서",
    "description": "사내 전체 문서",
    "search_fields": ["title^2", "content", "category"],
    "source_fields": ["title", "content", "url", "author", "date"],
    "result_format": {
      "type": "document",
      "title_field": "title",
      "content_field": "content",
      "url_field": "url"
    }
  },
  "technical_manuals": {
    "display_name": "기술 매뉴얼",
    "description": "기술 문서 및 매뉴얼",
    "search_fields": ["title^3", "content^2", "keywords"],
    "source_fields": ["title", "content", "url", "version"],
    "result_format": {
      "type": "document",
      "title_field": "title",
      "content_field": "content",
      "url_field": "url"
    }
  }
}
```

### 3단계: LLM 설정 변경 (필요시)

```bash
nano agent/react_agent.py
```

**130-134번 라인 수정:**
```python
# Azure OpenAI 사용 예시
from langchain_openai import AzureChatOpenAI

llm = AzureChatOpenAI(
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    azure_deployment=os.getenv("AZURE_DEPLOYMENT_NAME"),
    api_version="2024-02-15-preview",
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    temperature=0,
    streaming=True,
)
```

### 4단계: 연결 테스트

#### Elasticsearch 연결 테스트
```bash
cd backend-react
python3 << 'EOF'
from tools.elasticsearch_tool import ElasticsearchConfig

config = ElasticsearchConfig()
client = config.get_client()

# 연결 테스트
info = client.info()
print(f"✅ Elasticsearch 연결 성공!")
print(f"   버전: {info['version']['number']}")
print(f"   클러스터: {info['cluster_name']}")

# 인덱스 설정 확인
print(f"\n✅ 설정된 인덱스:")
for idx, cfg in config.index_configs.items():
    print(f"   - {idx}: {cfg['display_name']}")
EOF
```

#### LangGraph 서버 시작
```bash
langgraph dev --port 2025
```

**예상 로그:**
```
✅ Loaded index configurations for: company_docs, technical_manuals
🚀 API: http://127.0.0.1:2025
```

### 5단계: 프론트엔드 실행

```bash
cd research-agent
npm run dev
```

브라우저에서 `http://localhost:3000` 접속하여 테스트

### 6단계: 통합 테스트

1. **React Mode 선택**
2. **간단한 질문 입력** (예: "기술 문서 검색")
3. **결과 확인**
   - Thinking 단계 표시
   - 검색 수행
   - 결과 포맷팅 확인

---

## 트러블슈팅

### 1. Elasticsearch 연결 실패

**증상:**
```
❌ Elasticsearch 연결 실패: 서버가 실행 중인지 확인해주세요
```

**해결 방법:**
1. ES URL 확인: `.env`의 `ELASTICSEARCH_URL` 확인
2. 네트워크 접근 확인:
   ```bash
   curl -u username:password https://es-cluster.company.com:9200
   ```
3. 인증 정보 확인: `ELASTICSEARCH_USERNAME`, `ELASTICSEARCH_PASSWORD`
4. 방화벽 설정 확인

### 2. 인덱스 설정 로드 실패

**증상:**
```
⚠️ Index config file not found: config/es_indices.json
```

**해결 방법:**
1. 파일 존재 확인:
   ```bash
   ls -la config/es_indices.json
   ```
2. 환경 변수 확인:
   ```bash
   echo $ES_INDEX_CONFIG_FILE
   ```
3. 파일 권한 확인:
   ```bash
   chmod 644 config/es_indices.json
   ```

### 3. 인덱스가 인식되지 않음

**증상:**
```
❌ 인덱스 'my_index'에 대한 설정을 찾을 수 없습니다.
```

**해결 방법:**
1. `config/es_indices.json`에 인덱스 추가
2. 서버 재시작
3. 로그 확인:
   ```bash
   cat /tmp/langgraph.log | grep "Loaded index"
   ```

### 4. LLM API 오류

**증상:**
```
AuthenticationError: Invalid API key
```

**해결 방법:**
1. API 키 확인: `.env`의 키 값 확인
2. Azure 사용 시 엔드포인트 확인
3. 환경 변수 로드 확인:
   ```python
   import os
   from dotenv import load_dotenv
   load_dotenv()
   print(os.getenv("OPENAI_API_KEY"))
   ```

### 5. 검색 결과 포맷 오류

**증상:**
```
KeyError: 'title'
```

**해결 방법:**
1. `config/es_indices.json`의 `result_format` 확인
2. `source_fields`에 필요한 필드 포함 확인
3. Elasticsearch 인덱스의 실제 필드명 확인:
   ```bash
   curl -X GET "localhost:9200/your_index/_mapping?pretty"
   ```

### 6. 서버 재시작 후 설정 미적용

**증상:**
변경한 설정이 반영되지 않음

**해결 방법:**
1. 모든 LangGraph 프로세스 종료:
   ```bash
   pkill -f "langgraph dev"
   ```
2. 캐시 삭제:
   ```bash
   find . -type d -name "__pycache__" -exec rm -rf {} +
   find . -type f -name "*.pyc" -delete
   ```
3. 서버 재시작:
   ```bash
   langgraph dev --port 2025
   ```

---

## 보안 고려사항

### 1. 환경 변수 관리
- `.env` 파일을 git에 커밋하지 마세요
- `.gitignore`에 `.env` 추가 확인
- 프로덕션 환경에서는 비밀 관리 시스템 사용 (예: AWS Secrets Manager, HashiCorp Vault)

### 2. Elasticsearch 보안
- TLS/SSL 사용 권장
- 최소 권한 원칙에 따른 사용자 계정 생성
- IP 화이트리스트 설정

### 3. API 키 보호
- 환경 변수로만 관리
- 코드에 하드코딩 금지
- 정기적인 키 로테이션

---

## 추가 참고사항

### 인덱스 스키마 확인 명령어

```bash
# 인덱스 매핑 확인
curl -X GET "localhost:9200/your_index/_mapping?pretty"

# 샘플 문서 확인
curl -X GET "localhost:9200/your_index/_search?size=1&pretty"

# 인덱스 설정 확인
curl -X GET "localhost:9200/your_index/_settings?pretty"
```

### 로그 모니터링

```bash
# LangGraph 서버 로그
tail -f /tmp/langgraph.log

# 특정 패턴 검색
cat /tmp/langgraph.log | grep "Elasticsearch"
cat /tmp/langgraph.log | grep "ERROR"
```

### 성능 최적화

1. **Elasticsearch 쿼리 최적화**
   - `search_fields`의 가중치 조정
   - `fuzziness` 파라미터 튜닝

2. **캐싱 활용**
   - React Mode는 자동 캐싱 지원 (1시간 TTL)
   - 동일 쿼리 재검색 방지

3. **인덱스 최적화**
   - 필요한 필드만 `source_fields`에 포함
   - 불필요한 데이터 제외로 전송량 감소

---

## 문의 및 지원

- 기술 문의: [내부 이슈 트래커]
- 긴급 지원: [내부 지원 채널]
- 문서 업데이트: [내부 위키]

---

**마지막 업데이트:** 2025-12-01
**버전:** 1.0.0
