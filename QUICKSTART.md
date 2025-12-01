# 빠른 시작 가이드

5분 안에 AI Research Agent를 실행하는 단계별 가이드입니다.

## 📋 사전 준비

### 필수 설치 항목

1. **Node.js 20 이상**
   ```bash
   node --version  # v20.0.0 이상
   ```

2. **Python 3.9 이상**
   ```bash
   python --version  # Python 3.9.0 이상
   ```

3. **Elasticsearch** (선택사항, 로컬 테스트용)
   ```bash
   # Docker로 실행 (가장 간단)
   docker run -d -p 9200:9200 -e "discovery.type=single-node" elasticsearch:8.11.0
   ```

4. **OpenAI API Key**
   - [OpenAI 플랫폼](https://platform.openai.com/)에서 발급

---

## 🚀 5분 시작 가이드

### STEP 1: 프로젝트 클론 (이미 완료된 경우 건너뛰기)

```bash
git clone <repository-url>
cd claude_code
```

### STEP 2: 환경 변수 설정 (2분)

#### Backend 환경 변수

```bash
cd backend-react
nano .env
```

다음 내용 입력:

```env
# OpenAI API Key (필수)
OPENAI_API_KEY=your-openai-api-key-here

# Elasticsearch 설정
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme

# 인덱스 설정 (선택)
ES_DEFAULT_INDEX=sample_docs
ES_INDEX_CONFIG_FILE=config/indices.json

# LangSmith (선택, 디버깅용)
LANGCHAIN_TRACING_V2=false
```

#### Frontend 환경 변수

```bash
cd ../research-agent
nano .env.local
```

다음 내용 입력:

```env
# React Agent (기본 모드)
NEXT_PUBLIC_REACT_AGENT_URL=http://127.0.0.1:2025
NEXT_PUBLIC_REACT_ASSISTANT_ID=react_agent

# Deep Research (선택, 있는 경우에만)
NEXT_PUBLIC_LANGGRAPH_URL=http://127.0.0.1:2024
NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID=Deep Researcher
```

### STEP 3: 백엔드 실행 (1분)

```bash
cd backend-react

# Python 의존성 설치
pip install -r requirements.txt

# LangGraph CLI 설치 (처음 한 번만)
pip install -U "langgraph-cli[inmem]"

# 서버 시작
langgraph dev --port 2025
```

**성공 메시지 확인:**
```
✅ Loaded index configurations for: sample_docs
🚀 API: http://127.0.0.1:2025
```

### STEP 4: 프론트엔드 실행 (1분)

새 터미널 열기:

```bash
cd research-agent

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

**성공 메시지 확인:**
```
✓ Ready in 2.5s
○ Local:   http://localhost:3000
```

### STEP 5: 브라우저에서 확인 (30초)

1. 브라우저에서 **http://localhost:3000** 접속
2. 질문 입력창에 테스트 질문 입력
3. Enter 키 또는 전송 버튼 클릭
4. 응답 확인

---

## ✅ 동작 확인

### 1. Backend 서버 확인

```bash
# 상태 확인
curl http://localhost:2025/ok

# 기대 응답: {"status": "ok"}
```

### 2. Elasticsearch 확인 (선택)

```bash
# Elasticsearch 연결 확인
curl http://localhost:9200

# 인덱스 목록 확인
curl http://localhost:9200/_cat/indices
```

### 3. Frontend 확인

브라우저에서 http://localhost:3000 접속 후:
- ✅ 페이지가 정상 로드되는지 확인
- ✅ 입력창이 보이는지 확인
- ✅ Quick, Deep Research 버튼이 보이는지 확인

---

## 🎯 첫 질문 시도하기

### 예제 1: 기본 모드 (React Agent)

**버튼 상태:** 모두 OFF (기본값)

**질문 예시:**
```
"차량 고장 사례를 찾아줘"
"최근 문서에서 기술 문제를 검색해줘"
```

**특징:**
- ⚡ 빠른 응답 (2-3초)
- 📦 캐싱 적용
- 🔍 Elasticsearch 검색

### 예제 2: Quick 모드

**버튼 상태:** Quick 버튼 ON

**질문 예시:**
```
"오늘 날씨는?"
"최신 뉴스 요약해줘"
```

**특징:**
- 🔄 중간 속도 (10-20초)
- 🌐 웹 검색
- ❌ 캐싱 없음

### 예제 3: Deep Research 모드

**버튼 상태:** Deep Research 버튼 ON

**질문 예시:**
```
"전기차 배터리 기술의 최신 동향과 미래 전망을 분석해줘"
"인공지능 윤리 이슈에 대한 심층 리포트를 작성해줘"
```

**특징:**
- 🐌 느린 응답 (30초~수분)
- 📚 여러 소스 검색
- 📊 상세한 분석

---

## 🔧 자주 발생하는 문제

### 1. Backend 서버가 시작되지 않음

**증상:**
```
Error: Could not find langgraph command
```

**해결:**
```bash
pip install -U "langgraph-cli[inmem]"
```

### 2. Elasticsearch 연결 실패

**증상:**
```
ConnectionError: Cannot connect to Elasticsearch
```

**해결:**
```bash
# Elasticsearch가 실행 중인지 확인
curl http://localhost:9200

# Docker로 실행
docker run -d -p 9200:9200 -e "discovery.type=single-node" elasticsearch:8.11.0
```

### 3. Frontend에서 API 연결 안 됨

**증상:**
```
Failed to fetch from LangGraph API
```

**해결:**
1. `.env.local` 파일 확인
2. Backend 서버가 실행 중인지 확인
3. 포트 번호 확인 (2025)
4. 서버 재시작:
   ```bash
   # Backend
   cd backend-react
   pkill -f "langgraph dev"
   langgraph dev --port 2025

   # Frontend
   cd research-agent
   # Ctrl+C로 중지 후
   npm run dev
   ```

### 4. 환경 변수 변경이 반영 안 됨

**해결:**
```bash
# Frontend 서버 재시작 필요
# Ctrl+C로 중지 후
npm run dev

# 브라우저 하드 리로드
# Mac: Cmd + Shift + R
# Windows: Ctrl + Shift + R
```

### 5. OpenAI API 에러

**증상:**
```
Error: Invalid API key
```

**해결:**
1. `.env` 파일에서 `OPENAI_API_KEY` 확인
2. API 키가 유효한지 확인
3. 잔액이 있는지 확인
4. 서버 재시작

---

## 📊 샘플 데이터 추가 (선택)

Elasticsearch에 테스트 데이터를 추가하려면:

```bash
cd backend-react

# 샘플 데이터 생성 스크립트 실행
python scripts/add_sample_data.py
```

샘플 데이터 예시:
```json
{
  "title": "차량 고장 사례 #001",
  "content": "브레이크 시스템 오류로 인한 긴급 정비 사례",
  "category": "maintenance",
  "date": "2025-01-15"
}
```

---

## 🎓 다음 단계

### 1. 모드 이해하기
[README.md](./README.md)의 "모드별 비교" 섹션 참고

### 2. 아키텍처 학습
[ARCHITECTURE.md](./ARCHITECTURE.md)에서 전체 구조 이해

### 3. 커스터마이징
- [프론트엔드 설정](./research-agent/CONFIGURATION.md)
- [백엔드 배포](./backend-react/DEPLOYMENT_GUIDE.md)

### 4. Elasticsearch 인덱스 설정
[backend-react/DEPLOYMENT_GUIDE.md](./backend-react/DEPLOYMENT_GUIDE.md)의 인덱스 설정 섹션 참고

---

## 💡 유용한 팁

### 개발 환경 팁

1. **터미널 2개 사용**
   - 터미널 1: Backend 서버
   - 터미널 2: Frontend 서버

2. **로그 확인**
   ```bash
   # Backend 로그는 langgraph dev 터미널에서 확인
   # Frontend 로그는 npm run dev 터미널과 브라우저 콘솔에서 확인
   ```

3. **Hot Reload**
   - 코드 변경 시 자동으로 리로드
   - 환경 변수 변경 시에만 수동 재시작 필요

### 성능 최적화

1. **캐싱 활용**
   - 반복되는 질문은 React Agent 모드 사용
   - 캐시 적중 시 즉시 응답

2. **모드 선택**
   - 간단한 질문: React Agent (기본)
   - 빠른 웹 검색: Quick 모드
   - 복잡한 분석: Deep Research 모드

---

## 📞 도움말

문제가 해결되지 않으면:
1. [README.md](./README.md)의 트러블슈팅 섹션 확인
2. [ARCHITECTURE.md](./ARCHITECTURE.md)에서 구조 이해
3. 이슈 생성

---

**마지막 업데이트:** 2025-12-01
