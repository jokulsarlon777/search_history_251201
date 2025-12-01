# 사내 배포 빠른 시작 가이드

## 🚀 5분 안에 사내 환경 배포하기

### 1️⃣ 환경 변수 설정 (2분)

```bash
cd backend-react
nano .env
```

**필수 수정 항목:**
```env
# Elasticsearch (사내 서버로 변경)
ELASTICSEARCH_URL=https://es-cluster.company.com:9200
ELASTICSEARCH_USERNAME=service_account
ELASTICSEARCH_PASSWORD=your-password

# 인덱스 설정 (사내 인덱스로 변경)
ES_DEFAULT_INDEX=company_docs
ES_INDEX_CONFIG_FILE=config/company_indices.json
```

### 2️⃣ 인덱스 설정 작성 (2분)

```bash
nano config/company_indices.json
```

**최소 설정 예시:**
```json
{
  "company_docs": {
    "display_name": "회사 문서",
    "description": "사내 문서",
    "search_fields": ["title^2", "content"],
    "source_fields": ["title", "content", "url"],
    "result_format": {
      "type": "document",
      "title_field": "title",
      "content_field": "content",
      "url_field": "url"
    }
  }
}
```

### 3️⃣ 서버 시작 (1분)

```bash
langgraph dev --port 2025
```

**성공 확인:**
```
✅ Loaded index configurations for: company_docs
🚀 API: http://127.0.0.1:2025
```

---

## 📚 상세 문서

- **전체 배포 가이드:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
  - Elasticsearch 설정
  - LLM 변경 방법
  - 트러블슈팅
  - 보안 가이드

- **프론트엔드 설정:** [../research-agent/CONFIGURATION.md](../research-agent/CONFIGURATION.md)
  - 환경 변수 설정
  - 프로덕션 배포
  - API 엔드포인트 변경

---

## 🔧 체크리스트

### 배포 전 확인사항

- [ ] Elasticsearch 클러스터 접근 가능
- [ ] 인덱스 스키마 확인 및 매핑 작성
- [ ] 환경 변수 설정 완료
- [ ] LLM API 키 설정 (OpenAI/Azure/사내)
- [ ] 네트워크/방화벽 설정 확인

### 배포 후 테스트

- [ ] Elasticsearch 연결 테스트
- [ ] 인덱스 설정 로드 확인
- [ ] 간단한 검색 쿼리 테스트
- [ ] 프론트엔드 연결 확인

---

## 🆘 빠른 트러블슈팅

### Elasticsearch 연결 안 됨
```bash
# 연결 테스트
curl -u username:password $ELASTICSEARCH_URL
```

### 인덱스 설정 로드 안 됨
```bash
# 파일 확인
cat config/company_indices.json | python -m json.tool

# 서버 재시작
pkill -f "langgraph dev"
langgraph dev --port 2025
```

### 검색 결과 안 나옴
```bash
# 인덱스 확인
curl "$ELASTICSEARCH_URL/company_docs/_search?size=1&pretty"
```

---

## 📞 지원

- 상세 문서: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- 이슈 보고: [내부 이슈 트래커]
