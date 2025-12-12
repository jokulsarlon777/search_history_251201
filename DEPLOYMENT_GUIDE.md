# Docker 컨테이너 배포 가이드

이 가이드는 Research Agent 시스템을 Docker 컨테이너로 VM에 배포하는 방법을 설명합니다.

## 📋 시스템 구성

- **Frontend**: Next.js (Port 3000)
- **React Agent Backend**: Python/FastAPI (Port 2025)
- **Deep Research Agent Backend**: Python/LangGraph (Port 2024)
- **Elasticsearch**: 검색 엔진 (Port 9200)

## 🔧 사전 준비

### 1. VM 환경 준비

```bash
# Docker 설치 (Ubuntu/Debian 기준)
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# Docker 서비스 시작
sudo systemctl start docker
sudo systemctl enable docker

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER
newgrp docker
```

### 2. VM의 IP 주소 확인

```bash
# VM의 IP 주소 확인
ip addr show

# 예시 출력: 192.168.1.100
```

## 🚀 배포 단계

### Step 1: 저장소 Clone

```bash
# VM에서 실행
git clone <repository-url>
cd search_history_251201
```

### Step 2: 환경 변수 설정

VM의 **실제 IP 주소**로 `docker-compose.yml` 파일을 수정합니다:

```yaml
# docker-compose.yml의 frontend 서비스 부분
frontend:
  build:
    context: ./research-agent
    dockerfile: Dockerfile
    args:
      # ⚠️ 여기를 VM의 실제 IP로 변경
      NEXT_PUBLIC_REACT_AGENT_URL: http://192.168.1.100:2025  # ← 변경
      NEXT_PUBLIC_LANGGRAPH_URL: http://192.168.1.100:2024     # ← 변경
      NEXT_PUBLIC_ELASTICSEARCH_URL: http://192.168.1.100:9200 # ← 변경
```

### Step 3: Docker Compose로 전체 시스템 빌드 및 실행

```bash
# 전체 시스템 빌드
docker-compose build

# 백그라운드에서 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### Step 4: 서비스 상태 확인

```bash
# 모든 컨테이너 상태 확인
docker-compose ps

# 개별 서비스 로그 확인
docker-compose logs elasticsearch
docker-compose logs react-agent
docker-compose logs deep-research-agent
docker-compose logs frontend

# 헬스 체크
curl http://192.168.1.100:9200/_cluster/health  # Elasticsearch
curl http://192.168.1.100:2025/ok               # React Agent
curl http://192.168.1.100:2024/ok               # Deep Research Agent
curl http://192.168.1.100:3000                  # Frontend
```

## 🌐 네트워크 구성 설명

### 내부 네트워크 (Docker Bridge Network)

컨테이너 간 통신은 Docker 내부 네트워크(`research-network`)를 사용합니다:

```
elasticsearch       → http://elasticsearch:9200
react-agent        → http://react-agent:2025
deep-research-agent → http://deep-research-agent:2024
```

### 외부 접근 (Host Network)

사용자가 브라우저에서 접근할 때는 VM의 IP를 사용합니다:

```
Frontend    → http://192.168.1.100:3000
React Agent → http://192.168.1.100:2025
Deep Research → http://192.168.1.100:2024
Elasticsearch → http://192.168.1.100:9200
```

### 중요: 클라이언트 사이드 환경 변수

Next.js의 `NEXT_PUBLIC_*` 환경 변수는 **빌드 시점**에 클라이언트 코드에 포함됩니다.
따라서 사용자의 브라우저에서 백엔드 API를 호출할 때는 VM의 실제 IP 주소가 필요합니다.

## 🔒 방화벽 설정

VM의 방화벽에서 필요한 포트를 열어야 합니다:

```bash
# UFW (Ubuntu) 예시
sudo ufw allow 3000/tcp   # Frontend
sudo ufw allow 2025/tcp   # React Agent
sudo ufw allow 2024/tcp   # Deep Research Agent
sudo ufw allow 9200/tcp   # Elasticsearch (필요시)

# 또는 firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=2025/tcp
sudo firewall-cmd --permanent --add-port=2024/tcp
sudo firewall-cmd --permanent --add-port=9200/tcp
sudo firewall-cmd --reload
```

## 📊 모니터링

### 컨테이너 리소스 사용량 확인

```bash
# 실시간 모니터링
docker stats

# 특정 컨테이너만
docker stats elasticsearch react-agent deep-research-agent frontend
```

### 로그 확인

```bash
# 전체 로그
docker-compose logs -f

# 특정 서비스 로그 (최근 100줄)
docker-compose logs --tail=100 frontend

# 에러 로그만 필터링
docker-compose logs -f | grep ERROR
```

## 🔄 업데이트 및 재배포

### 코드 업데이트

```bash
# 최신 코드 pull
git pull origin feature/ux-integration

# 특정 서비스만 재빌드 & 재시작
docker-compose build frontend
docker-compose up -d frontend

# 모든 서비스 재빌드 & 재시작
docker-compose down
docker-compose build
docker-compose up -d
```

### 환경 변수만 변경

```bash
# docker-compose.yml 수정 후
docker-compose up -d --force-recreate frontend
```

## 🛑 서비스 중지 및 삭제

```bash
# 서비스 중지 (컨테이너만 중지, 볼륨은 유지)
docker-compose stop

# 서비스 중지 및 컨테이너 삭제 (볼륨은 유지)
docker-compose down

# 모든 것 삭제 (볼륨 포함)
docker-compose down -v

# 이미지까지 모두 삭제
docker-compose down --rmi all -v
```

## 🐛 트러블슈팅

### 1. 포트 충돌

```bash
# 포트 사용 중인 프로세스 확인
sudo lsof -i :3000
sudo lsof -i :2025
sudo lsof -i :2024
sudo lsof -i :9200

# 프로세스 종료
sudo kill -9 <PID>
```

### 2. Elasticsearch 메모리 부족

```yaml
# docker-compose.yml에서 메모리 설정 조정
elasticsearch:
  environment:
    - "ES_JAVA_OPTS=-Xms1g -Xmx1g"  # 1GB로 증가
```

### 3. 네트워크 연결 오류

```bash
# Docker 네트워크 재생성
docker-compose down
docker network prune
docker-compose up -d
```

### 4. 빌드 캐시 문제

```bash
# 캐시 없이 재빌드
docker-compose build --no-cache
```

### 5. 권한 문제

```bash
# Docker 소켓 권한 확인
sudo chmod 666 /var/run/docker.sock

# 또는 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER
newgrp docker
```

## 📝 환경별 설정 예시

### 개발 환경 (localhost)

```yaml
NEXT_PUBLIC_REACT_AGENT_URL: http://localhost:2025
NEXT_PUBLIC_LANGGRAPH_URL: http://localhost:2024
NEXT_PUBLIC_ELASTICSEARCH_URL: http://localhost:9200
```

### 스테이징 환경 (내부 IP)

```yaml
NEXT_PUBLIC_REACT_AGENT_URL: http://192.168.1.100:2025
NEXT_PUBLIC_LANGGRAPH_URL: http://192.168.1.100:2024
NEXT_PUBLIC_ELASTICSEARCH_URL: http://192.168.1.100:9200
```

### 프로덕션 환경 (도메인)

```yaml
NEXT_PUBLIC_REACT_AGENT_URL: https://react-agent.yourdomain.com
NEXT_PUBLIC_LANGGRAPH_URL: https://research-agent.yourdomain.com
NEXT_PUBLIC_ELASTICSEARCH_URL: https://search.yourdomain.com
```

## 🔐 보안 권장사항

1. **Elasticsearch 보안 활성화**
   ```yaml
   environment:
     - xpack.security.enabled=true
     - ELASTIC_PASSWORD=your_strong_password
   ```

2. **API 키 설정**
   ```yaml
   environment:
     - API_KEY_SECRET=your_secret_key
   ```

3. **HTTPS 사용** (Nginx Reverse Proxy 권장)

4. **방화벽에서 Elasticsearch 포트 차단** (내부 통신만 허용)

## 📞 지원

문제가 발생하면 다음을 확인하세요:

1. 모든 컨테이너가 정상 실행 중인지: `docker-compose ps`
2. 로그에 에러가 있는지: `docker-compose logs -f`
3. 네트워크 연결이 정상인지: `docker network inspect search_history_251201_research-network`
4. 헬스 체크 상태: `docker inspect <container-name> | grep Health`
