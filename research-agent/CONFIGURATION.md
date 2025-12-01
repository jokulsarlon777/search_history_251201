# 프론트엔드 설정 가이드

이 문서는 Research Agent 프론트엔드의 환경 설정 가이드입니다.

## 📋 목차

1. [환경 변수 설정](#환경-변수-설정)
2. [API 엔드포인트 변경](#api-엔드포인트-변경)
3. [개발 환경 설정](#개발-환경-설정)
4. [프로덕션 배포](#프로덕션-배포)

---

## 환경 변수 설정

### `.env.local` 파일 구조

```env
# React Agent (기본 모드 - 빠른 응답)
NEXT_PUBLIC_REACT_AGENT_URL=http://127.0.0.1:2025
NEXT_PUBLIC_REACT_ASSISTANT_ID=react_agent

# Deep Research Agent (심층 분석 모드)
NEXT_PUBLIC_LANGGRAPH_URL=http://127.0.0.1:2024
NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID=Deep Researcher
NEXT_PUBLIC_LANGGRAPH_API_KEY=
```

### 환경 변수 설명

| 변수명 | 설명 | 기본값 | 필수 여부 |
|--------|------|--------|----------|
| `NEXT_PUBLIC_REACT_AGENT_URL` | React Agent 서버 주소 (기본 모드) | `http://127.0.0.1:2025` | ✅ 필수 |
| `NEXT_PUBLIC_REACT_ASSISTANT_ID` | React Agent Assistant ID | `react_agent` | ✅ 필수 |
| `NEXT_PUBLIC_LANGGRAPH_URL` | Deep Research API 서버 주소 | `http://127.0.0.1:2024` | ✅ 필수 |
| `NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID` | Deep Research Assistant ID | `Deep Researcher` | ✅ 필수 |
| `NEXT_PUBLIC_LANGGRAPH_API_KEY` | Deep Research API 키 (필요시) | (비어있음) | ❌ 선택 |

---

## API 엔드포인트 변경

### 개발 환경

**로컬 개발 (기본값):**
```env
# React Agent (기본 모드)
NEXT_PUBLIC_REACT_AGENT_URL=http://127.0.0.1:2025

# Deep Research (심층 분석 모드)
NEXT_PUBLIC_LANGGRAPH_URL=http://127.0.0.1:2024
```

### 사내 환경

**사내 서버 사용:**
```env
# React Agent (기본 모드 - 사내 React Agent 서버)
NEXT_PUBLIC_REACT_AGENT_URL=https://react-agent.company.com
NEXT_PUBLIC_REACT_ASSISTANT_ID=react_agent

# Deep Research (심층 분석 모드 - 사내 API 서버)
NEXT_PUBLIC_LANGGRAPH_URL=https://internal-research.company.com
NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID=Deep Researcher
NEXT_PUBLIC_LANGGRAPH_API_KEY=your-internal-api-key
```

### 프로덕션 환경

**프로덕션 배포:**
```env
# React Agent (기본 모드)
NEXT_PUBLIC_REACT_AGENT_URL=https://react-agent.production.com
NEXT_PUBLIC_REACT_ASSISTANT_ID=react_agent

# Deep Research (심층 분석 모드)
NEXT_PUBLIC_LANGGRAPH_URL=https://research-api.production.com
NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID=Deep Researcher
NEXT_PUBLIC_LANGGRAPH_API_KEY=prod-api-key
```

---

## 개발 환경 설정

### 1. 환경 변수 파일 생성

```bash
cd research-agent
cp .env.local .env.local.example  # 백업
nano .env.local
```

### 2. 개발 서버 실행

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

서버가 `http://localhost:3000`에서 실행됩니다.

### 3. 환경 변수 확인

브라우저 콘솔에서 확인:
```javascript
console.log({
  deepResearchUrl: process.env.NEXT_PUBLIC_LANGGRAPH_URL,
  reactAgentUrl: process.env.NEXT_PUBLIC_REACT_AGENT_URL,
});
```

---

## 모드별 동작 방식

### React Agent 모드 (기본값)

- **활성화:** 버튼을 누르지 않은 상태 (기본 모드)
- **서버:** `NEXT_PUBLIC_REACT_AGENT_URL`에서 지정한 서버 (포트 2025)
- **특징:**
  - Elasticsearch 직접 검색
  - ReAct 에이전트 사용
  - 빠른 응답 (수초)
  - **응답 캐싱 지원 (1시간 TTL)**
  - 단계별 진행 상황 표시 (🤔 Thinking → 🔧 Tool 사용 → 📝 답변 작성)
  - 캐시 적중 시 즉시 응답

### Quick 모드

- **활성화:** Quick 버튼 ON
- **서버:** `NEXT_PUBLIC_LANGGRAPH_URL`에서 지정한 서버 (포트 2024)
- **특징:**
  - Deep Research의 빠른 버전
  - 제한된 반복 횟수 (max_researcher_iterations: 1)
  - 짧은 응답 시간
  - 캐싱 없음

### Deep Research 모드

- **활성화:** Deep Research 버튼 ON
- **서버:** `NEXT_PUBLIC_LANGGRAPH_URL`에서 지정한 서버 (포트 2024)
- **특징:**
  - 심층 리서치 수행
  - 여러 소스 검색 및 분석
  - 긴 응답 시간 (30초~수분)
  - 최대 반복 횟수 (max_researcher_iterations: 10)
  - 캐싱 없음

---

## 프로덕션 배포

### Vercel 배포

**1. Vercel 프로젝트 설정:**

```bash
vercel
```

**2. 환경 변수 설정:**

Vercel Dashboard → Settings → Environment Variables에서 추가:

| 키 | 값 | 환경 |
|----|----|----|
| `NEXT_PUBLIC_REACT_AGENT_URL` | `https://react-agent.production.com` | Production |
| `NEXT_PUBLIC_REACT_ASSISTANT_ID` | `react_agent` | Production |
| `NEXT_PUBLIC_LANGGRAPH_URL` | `https://research-api.production.com` | Production |
| `NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID` | `Deep Researcher` | Production |

**3. 배포:**

```bash
vercel --prod
```

### Docker 배포

**Dockerfile:**

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# 환경 변수는 빌드 시점에 주입
ARG NEXT_PUBLIC_REACT_AGENT_URL
ARG NEXT_PUBLIC_REACT_ASSISTANT_ID
ARG NEXT_PUBLIC_LANGGRAPH_URL
ARG NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

**빌드 및 실행:**

```bash
# 이미지 빌드
docker build \
  --build-arg NEXT_PUBLIC_REACT_AGENT_URL=https://react-agent.company.com \
  --build-arg NEXT_PUBLIC_REACT_ASSISTANT_ID=react_agent \
  --build-arg NEXT_PUBLIC_LANGGRAPH_URL=https://research-api.company.com \
  --build-arg NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID="Deep Researcher" \
  -t research-agent:latest .

# 컨테이너 실행
docker run -p 3000:3000 research-agent:latest
```

### Kubernetes 배포

**deployment.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: research-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: research-agent
  template:
    metadata:
      labels:
        app: research-agent
    spec:
      containers:
      - name: research-agent
        image: research-agent:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_REACT_AGENT_URL
          value: "https://react-agent.company.com"
        - name: NEXT_PUBLIC_REACT_ASSISTANT_ID
          value: "react_agent"
        - name: NEXT_PUBLIC_LANGGRAPH_URL
          value: "https://research-api.company.com"
        - name: NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID
          value: "Deep Researcher"
---
apiVersion: v1
kind: Service
metadata:
  name: research-agent
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: research-agent
```

---

## 트러블슈팅

### 1. API 연결 실패

**증상:**
```
Failed to fetch from LangGraph API
```

**해결 방법:**
1. API 서버 URL 확인
2. CORS 설정 확인 (백엔드에서 프론트엔드 도메인 허용)
3. 네트워크 연결 확인
4. 브라우저 콘솔에서 에러 확인

### 2. 환경 변수 미적용

**증상:**
환경 변수 변경이 반영되지 않음

**해결 방법:**
1. `.env.local` 파일 저장 확인
2. 개발 서버 재시작:
   ```bash
   # Ctrl+C로 서버 중지 후
   npm run dev
   ```
3. 브라우저 캐시 삭제 (Hard Reload: Cmd+Shift+R / Ctrl+Shift+R)

### 3. CORS 에러

**증상:**
```
Access to fetch at '...' has been blocked by CORS policy
```

**해결 방법:**

백엔드 서버에서 CORS 설정 추가 필요:

**FastAPI (백엔드):**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 캐싱 관리

### React Agent 캐시 (기본 모드)

React Agent 모드는 자동으로 응답을 캐싱합니다:

- **적용 모드:** React Agent (기본값, 버튼 누르지 않은 상태)
- **TTL:** 1시간 (3600초)
- **저장소:** 브라우저 메모리
- **키:** 쿼리 문자열
- **미적용 모드:** Quick 모드, Deep Research 모드

**캐시 통계 확인:**
```javascript
// 브라우저 콘솔에서
import { reactModeCache } from '@/lib/cache';
const stats = reactModeCache.getStats();
console.log(stats);
```

**캐시 수동 삭제:**
```javascript
reactModeCache.clear();
```

**참고:** Quick 모드나 Deep Research 모드를 사용할 때는 캐싱이 적용되지 않습니다.

---

## 개발 팁

### 1. API 엔드포인트 빠른 전환

**개발/프로덕션 환경 변수 관리:**

```bash
# 개발 환경
cp .env.local.dev .env.local

# 프로덕션 환경
cp .env.local.prod .env.local
```

### 2. 로컬 백엔드 테스트

```bash
# 터미널 1: 백엔드 서버
cd backend-react
langgraph dev --port 2025

# 터미널 2: 프론트엔드
cd research-agent
npm run dev
```

### 3. Hot Reload

Next.js는 자동 Hot Reload를 지원하지만, 환경 변수 변경 시에는 서버 재시작이 필요합니다.

---

## 보안 고려사항

### 1. API 키 관리

- **절대 금지:** API 키를 클라이언트 코드에 하드코딩
- **권장:** 서버 사이드에서만 민감한 키 사용
- `NEXT_PUBLIC_` 접두사가 있는 환경 변수는 클라이언트에 노출됩니다

### 2. HTTPS 사용

프로덕션 환경에서는 반드시 HTTPS 사용:
```env
NEXT_PUBLIC_LANGGRAPH_URL=https://secure-api.company.com  # ✅ 좋음
NEXT_PUBLIC_LANGGRAPH_URL=http://api.company.com          # ❌ 나쁨
```

---

## 추가 리소스

- [Next.js 환경 변수 문서](https://nextjs.org/docs/basic-features/environment-variables)
- [LangGraph SDK 문서](https://langchain-ai.github.io/langgraph/)
- [백엔드 배포 가이드](../backend-react/DEPLOYMENT_GUIDE.md)

---

**마지막 업데이트:** 2025-12-01
**버전:** 1.0.0
