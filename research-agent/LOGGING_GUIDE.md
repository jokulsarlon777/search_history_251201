# 📊 로깅 시스템 사용 가이드

AI Research Agent의 로깅 시스템 사용 방법을 안내합니다.

---

## 목차

1. [로그 확인 방법](#로그-확인-방법)
2. [브라우저 로그 뷰어 사용법](#1-브라우저-로그-뷰어-권장)
3. [개발자 콘솔 사용법](#2-개발자-콘솔)
4. [서버 로그 파일 확인](#3-서버-로그-파일)
5. [Beta 분석 가이드](#beta-분석-가이드)
6. [트러블슈팅](#트러블슈팅)

---

## 로그 확인 방법

로그를 확인하는 **3가지 방법**이 있습니다:

| 방법 | 난이도 | 추천 대상 | 특징 |
|------|--------|-----------|------|
| 1. 브라우저 로그 뷰어 | ⭐ 쉬움 | 모든 사용자 | UI로 편하게 확인, 필터링, Export |
| 2. 개발자 콘솔 | ⭐⭐ 보통 | 개발자 | 실시간 색상 코딩, 즉시 확인 |
| 3. 서버 로그 파일 | ⭐⭐⭐ 어려움 | 관리자 | 전체 사용자 로그, 분석용 |

---

## 1. 브라우저 로그 뷰어 (권장)

### ✅ 가장 편한 방법 - UI로 확인

#### 📍 위치
웹 애플리케이션 **헤더 오른쪽**의 **📄 아이콘** 버튼

#### 🎯 사용법

**1단계: 로그 뷰어 열기**
```
1. 브라우저에서 http://localhost:3000 접속
2. 화면 상단 헤더 오른쪽에 있는 📄 (문서 아이콘) 버튼 클릭
3. "로그 뷰어" 다이얼로그가 열림
```

**2단계: 로그 확인**
- **통계 대시보드**: 상단에 총 로그 수, 에러, 경고, 정보 표시
- **로그 목록**: 시간 순으로 정렬된 로그 확인
- **색상 코딩**:
  - 🔴 빨강: ERROR
  - 🟡 노랑: WARN
  - 🔵 파랑: INFO
  - ⚪ 회색: DEBUG

**3단계: 필터링**
```
- 검색창: 키워드로 검색 (예: "전기차", "timeout")
- Level 드롭다운: DEBUG, INFO, WARN, ERROR 선택
- Category 드롭다운: API, USER, CACHE, THREAD 등 선택
```

**4단계: Export**
```
- "Export JSON" 버튼: 전체 로그를 JSON 파일로 다운로드
- "Export CSV" 버튼: Excel에서 열 수 있는 CSV 파일로 다운로드
```

#### 💡 활용 예시

**디버깅 시나리오:**
```
문제: "질문을 보냈는데 응답이 안 와요"

해결 방법:
1. 로그 뷰어 열기
2. Level 필터를 "ERROR"로 설정
3. 최근 로그 확인
4. 에러 메시지에서 원인 파악
   - "Network error" → 백엔드 서버 확인
   - "Timeout" → 응답 시간 초과
   - "404" → 잘못된 API 경로
```

**사용 패턴 분석:**
```
목표: "사용자들이 어떤 모드를 많이 쓰는지 확인"

방법:
1. 로그 뷰어 열기
2. Category 필터를 "INTERACTION"으로 설정
3. 검색창에 "mode_change" 입력
4. 로그 확인하여 모드 변경 패턴 분석
```

---

## 2. 개발자 콘솔

### 🔧 개발자를 위한 실시간 로그

#### 📍 위치
브라우저 개발자 도구 (F12) → Console 탭

#### 🎯 사용법

**1단계: 개발자 콘솔 열기**
```
- Chrome/Edge: F12 또는 Cmd+Option+I (Mac), Ctrl+Shift+I (Windows)
- Firefox: F12 또는 Cmd+Option+K (Mac), Ctrl+Shift+K (Windows)
- Safari: Cmd+Option+C (Mac, 개발자 메뉴 활성화 필요)
```

**2단계: 로그 확인**
```
실시간으로 색상 코딩된 로그가 출력됩니다:

예시:
🌐 [INFO] [API] 10:30:15 - API request started { mode: "react", ... }
💾 [INFO] [CACHE] 10:30:16 - Cache hit { savedTime: 1500 }
❌ [ERROR] [ERROR] 10:30:20 - API request failed { message: "timeout" }
```

**3단계: 필터링**
```
콘솔 상단 필터 입력창 사용:
- "ERROR" 입력 → 에러만 표시
- "CACHE" 입력 → 캐시 관련 로그만 표시
- "API" 입력 → API 관련 로그만 표시
```

#### 💡 활용 예시

**실시간 디버깅:**
```
1. 콘솔 열어두기
2. 질문 입력
3. 실시간으로 로그 확인:
   - API 요청 시작
   - 스트리밍 이벤트
   - 응답 완료
   - 에러 발생 시 즉시 확인
```

**성능 모니터링:**
```
1. 콘솔에서 "duration" 검색
2. API 응답 시간 확인
3. 느린 요청 식별
```

---

## 3. 서버 로그 파일

### 💾 관리자를 위한 중앙 집중식 로그

#### 📍 위치
```
/Users/jokull/dev/claude_code/search_previous_car_251201/research-agent/logs/
```

#### 📁 파일 구조
```
logs/
├── 2025-12-08.log    # 오늘 로그 (NDJSON 형식)
├── 2025-12-07.log    # 어제 로그
├── 2025-12-06.log    # 그저께 로그
└── ...
```

#### 🎯 사용법

**방법 1: 파일 직접 열기**
```bash
# 최신 로그 확인
cat logs/2025-12-08.log

# 읽기 쉽게 포맷팅
cat logs/2025-12-08.log | jq .

# 실시간 모니터링
tail -f logs/2025-12-08.log
```

**방법 2: 검색 및 필터링**
```bash
# 에러만 보기
grep "ERROR" logs/2025-12-08.log

# 특정 키워드 검색
grep "전기차" logs/2025-12-08.log

# 에러 개수 세기
grep -c "ERROR" logs/*.log

# 특정 시간대 로그
grep "10:30" logs/2025-12-08.log
```

**방법 3: API로 조회**
```bash
# 오늘 로그 조회
curl http://localhost:3000/api/logs

# 특정 날짜 로그 조회
curl "http://localhost:3000/api/logs?date=2025-12-08"

# JSON으로 저장
curl "http://localhost:3000/api/logs?date=2025-12-08" > logs-today.json
```

#### 💡 활용 예시

**전체 사용자 에러 분석:**
```bash
# 오늘 발생한 모든 에러 확인
grep "\"level\":\"ERROR\"" logs/2025-12-08.log | jq .

# 에러 유형별 분류
grep "\"level\":\"ERROR\"" logs/2025-12-08.log | jq -r '.data.error.message' | sort | uniq -c
```

**사용 통계:**
```bash
# 오늘 총 질문 수
grep "\"interactionType\":\"question\"" logs/2025-12-08.log | wc -l

# 모드별 사용 빈도
grep "\"mode\":\"react\"" logs/2025-12-08.log | wc -l
grep "\"mode\":\"quick\"" logs/2025-12-08.log | wc -l
grep "\"mode\":\"deep\"" logs/2025-12-08.log | wc -l
```

---

## Beta 분석 가이드

### 🎯 Closed Beta 테스트에서 사용자 행동 분석

### 📊 사용자 피드백 분석 (NEW!)

Closed Beta 테스트에서 **별 5개 평점 + 의견** 피드백을 수집하고 분석할 수 있습니다.

#### 피드백 시스템 작동 방식

**사용자 경험:**
1. AI 답변이 완료되면 자동으로 피드백 UI 표시
2. 별 1~5개 선택 (필수)
3. 의견 작성 (선택사항, 최대 500자)
4. 제출 버튼 클릭

**수집되는 데이터:**
- 별점 (1-5)
- 선택적 의견 (텍스트)
- 답변 메타데이터 (모드, 응답 시간)
- Thread ID
- 타임스탬프

#### 피드백 데이터 확인 방법

**방법 1: 로그 파일에서 추출**

```bash
# 모든 피드백 로그 추출
grep "\"interactionType\":\"feedback\"" logs/*.log > feedbacks.log

# 별점별 분류
grep "\"rating\":5" feedbacks.log | wc -l  # 5점
grep "\"rating\":4" feedbacks.log | wc -l  # 4점
grep "\"rating\":3" feedbacks.log | wc -l  # 3점
grep "\"rating\":2" feedbacks.log | wc -l  # 2점
grep "\"rating\":1" feedbacks.log | wc -l  # 1점

# 평균 별점 계산
grep "\"interactionType\":\"feedback\"" logs/*.log | \
  jq -r '.rating' | \
  awk '{sum+=$1; count++} END {print "Average:", sum/count}'

# 의견이 있는 피드백만 추출
grep "\"interactionType\":\"feedback\"" logs/*.log | \
  jq 'select(.comment != null)' | \
  jq -r '.comment'
```

**방법 2: 브라우저 로그 뷰어 사용**

```
1. 로그 뷰어 열기 (📄 버튼)
2. Category 필터를 "INTERACTION"으로 설정
3. 검색창에 "feedback" 입력
4. Export JSON 또는 Export CSV 클릭
```

**방법 3: API로 조회 (향후 추가 예정)**

```bash
# 피드백 전용 API 엔드포인트
curl "http://localhost:3000/api/feedback?date=2025-12-08"
```

#### 피드백 분석 시나리오

**시나리오 1: 평균 만족도 측정**

```bash
# 전체 평균 별점
grep "\"interactionType\":\"feedback\"" logs/*.log | \
  jq -r '.rating' | \
  awk '{sum+=$1; count++} END {printf "%.2f\n", sum/count}'

# 모드별 평균 별점
echo "React Mode:"
grep "\"mode\":\"react\"" logs/*.log | grep "feedback" | \
  jq -r '.rating' | \
  awk '{sum+=$1; count++} END {printf "%.2f (n=%d)\n", sum/count, count}'

echo "Quick Mode:"
grep "\"mode\":\"quick\"" logs/*.log | grep "feedback" | \
  jq -r '.rating' | \
  awk '{sum+=$1; count++} END {printf "%.2f (n=%d)\n", sum/count, count}'

echo "Deep Research Mode:"
grep "\"mode\":\"deep\"" logs/*.log | grep "feedback" | \
  jq -r '.rating' | \
  awk '{sum+=$1; count++} END {printf "%.2f (n=%d)\n", sum/count, count}'
```

**시나리오 2: 낮은 별점 원인 파악**

```bash
# 1-2점 피드백의 의견 확인
grep "\"interactionType\":\"feedback\"" logs/*.log | \
  jq 'select(.rating <= 2)' | \
  jq -r '"별점: \(.rating)점, 의견: \(.comment // "없음")"'

# 1-2점 피드백의 답변 미리보기
grep "\"interactionType\":\"feedback\"" logs/*.log | \
  jq 'select(.rating <= 2)' | \
  jq -r '"[\(.rating)점] \(.answerPreview)"'
```

**시나리오 3: 의견 키워드 분석**

```bash
# 모든 의견 추출
grep "\"interactionType\":\"feedback\"" logs/*.log | \
  jq -r '.comment // empty' > comments.txt

# 자주 언급되는 단어 (한글)
cat comments.txt | \
  grep -o '[가-힣]\+' | \
  sort | uniq -c | sort -nr | head -20

# 긍정적 키워드
grep -i "좋\|훌륭\|완벽\|빠르\|정확" comments.txt

# 부정적 키워드
grep -i "느리\|이상\|틀리\|부정확\|아쉽" comments.txt
```

**시나리오 4: Excel로 분석**

```bash
# 피드백 데이터를 CSV로 변환
echo "Timestamp,Rating,Mode,Duration,Comment,Answer Preview" > feedback-analysis.csv

grep "\"interactionType\":\"feedback\"" logs/*.log | \
  jq -r '[.timestamp, .rating, .mode, .duration, (.comment // ""), (.answerPreview // "")] | @csv' >> feedback-analysis.csv

# Excel에서 열기
# - 피벗 테이블: 별점 분포
# - 차트: 시간대별 만족도 추이
# - 필터: 의견이 있는 피드백만 보기
```

#### 피드백 데이터 구조

**로그 엔트리 예시:**

```json
{
  "timestamp": "2025-12-08T10:30:45.123Z",
  "level": "INFO",
  "category": "INTERACTION",
  "message": "User feedback: 5 stars",
  "interactionType": "feedback",
  "sessionId": "session_1733654400_abc123",
  "rating": 5,
  "comment": "정말 빠르고 정확한 답변이었습니다!",
  "messageId": "thread_xyz-3",
  "threadId": "thread_xyz",
  "mode": "react",
  "duration": 1200,
  "answerPreview": "전기차 배터리 수명은 일반적으로 8-10년이며..."
}
```

#### 방법 1: Thread Export API 사용

**모든 대화 내용 가져오기:**
```bash
# JSON 형식으로 전체 Thread 데이터 조회
curl "http://localhost:3000/api/admin/threads" > beta-threads.json

# CSV 형식으로 다운로드 (Excel에서 바로 열기)
curl "http://localhost:3000/api/admin/threads?format=csv" -o beta-analysis.csv

# React Agent 모드만 조회
curl "http://localhost:3000/api/admin/threads?server=react" > react-threads.json

# Deep Research 모드만 조회
curl "http://localhost:3000/api/admin/threads?server=research" > research-threads.json
```

**CSV 파일 분석 (Excel):**
```
1. beta-analysis.csv 파일을 Excel에서 열기
2. 데이터 분석:
   - Thread ID: 각 대화 세션
   - Server Type: react / research (사용한 모드)
   - Question: 사용자 질문
   - Answer: AI 답변
   - Duration: 응답 시간 (ms)
   - Sources: 사용된 소스 개수

3. 피벗 테이블로 통계:
   - 모드별 사용 빈도
   - 평균 응답 시간
   - 가장 많이 묻는 질문
```

#### 방법 2: 로그 파일에서 추출

**질문-답변 쌍 추출:**
```bash
# 모든 사용자 질문 추출
grep "\"interactionType\":\"question\"" logs/*.log | jq -r '.content' > questions.txt

# 모든 답변 추출
grep "\"interactionType\":\"answer\"" logs/*.log | jq -r '.content' > answers.txt

# 질문과 응답 시간 함께 추출
grep "\"interactionType\":\"answer\"" logs/*.log | jq '{question: .content, duration: .duration}' > qa-with-duration.json
```

**모드별 사용 통계:**
```bash
# React 모드 사용 횟수
grep "\"mode\":\"react\"" logs/*.log | wc -l

# Quick 모드 사용 횟수
grep "\"mode\":\"quick\"" logs/*.log | wc -l

# Deep Research 모드 사용 횟수
grep "\"mode\":\"deep\"" logs/*.log | wc -l
```

**평균 응답 시간 계산:**
```bash
# 모든 답변의 평균 응답 시간
grep "\"interactionType\":\"answer\"" logs/*.log | jq -r '.duration' | awk '{sum+=$1; count++} END {print "Average:", sum/count, "ms"}'

# React 모드 평균 응답 시간
grep "\"mode\":\"react\"" logs/*.log | grep "\"interactionType\":\"answer\"" | jq -r '.duration' | awk '{sum+=$1; count++} END {print "React Mode Average:", sum/count, "ms"}'
```

#### 방법 3: 브라우저 로그 뷰어 Export

```
1. 브라우저 로그 뷰어 열기 (📄 버튼)
2. Category 필터를 "INTERACTION"으로 설정
3. "Export JSON" 또는 "Export CSV" 클릭
4. 다운로드된 파일을 Excel이나 Python으로 분석
```

---

## 분석 시나리오 예시

### 시나리오 1: 사용자 만족도 분석

**목표**: 어떤 모드가 가장 많이 사용되는지, 응답 시간은 적절한지

**분석 방법**:
```bash
# 1. Thread 데이터를 CSV로 다운로드
curl "http://localhost:3000/api/admin/threads?format=csv" -o beta-data.csv

# 2. Excel에서 열어서 분석
# - Server Type별로 필터링
# - Duration 평균 계산
# - 질문 유형 분류
```

### 시나리오 2: 에러 패턴 분석

**목표**: 어떤 에러가 자주 발생하는지 파악

**분석 방법**:
```bash
# 1. 모든 에러 로그 추출
grep "\"level\":\"ERROR\"" logs/*.log > all-errors.log

# 2. 에러 유형별 분류
cat all-errors.log | jq -r '.data.error.message' | sort | uniq -c | sort -nr

# 3. 가장 많이 발생한 에러 Top 10
cat all-errors.log | jq -r '.data.error.message' | sort | uniq -c | sort -nr | head -10
```

### 시나리오 3: 캐시 효율성 분석

**목표**: 캐시가 얼마나 효과적인지 측정

**분석 방법**:
```bash
# 캐시 히트 횟수
grep "Cache hit" logs/*.log | wc -l

# 캐시 미스 횟수
grep "Cache miss" logs/*.log | wc -l

# 캐시 히트율 계산
# (히트 횟수) / (히트 + 미스) * 100
```

---

## 로그 레벨 이해하기

### 각 레벨의 의미와 사용 시점

| 레벨 | 의미 | 언제 사용? | 예시 |
|------|------|------------|------|
| **DEBUG** | 디버깅 정보 | 개발 중 상세 정보 | "Streaming chunk received" |
| **INFO** | 일반 정보 | 정상 동작 기록 | "API request completed" |
| **WARN** | 경고 | 문제될 수 있는 상황 | "Cache is full", "Slow response" |
| **ERROR** | 에러 | 실패한 작업 | "API request failed", "Network error" |

### 프로덕션 vs 개발 환경

**개발 환경 (npm run dev)**:
- 모든 레벨 로깅 (DEBUG, INFO, WARN, ERROR)
- 상세한 정보 출력
- 성능보다 디버깅 우선

**프로덕션 환경**:
- WARN, ERROR만 로깅
- 필수 정보만 기록
- 성능 최적화

---

## 로그 카테고리 설명

### 각 카테고리가 의미하는 것

| 카테고리 | 설명 | 주요 로그 |
|----------|------|-----------|
| **API** | API 요청/응답 | 요청 시작, 완료, 실패, 응답 시간 |
| **USER** | 사용자 액션 | 버튼 클릭, 입력, 모드 변경 |
| **CACHE** | 캐시 관련 | 캐시 히트, 미스, 저장 |
| **STREAM** | 스트리밍 이벤트 | 청크 수신, 진행 상황 |
| **THREAD** | Thread 관리 | 생성, 삭제, 전환 |
| **ERROR** | 에러 | 모든 에러 |
| **PERFORMANCE** | 성능 메트릭 | 응답 시간, 메모리 사용량 |
| **INTERACTION** | 사용자 상호작용 | 질문, 답변 (Beta 분석용) |

---

## 트러블슈팅

### 문제 1: 로그 뷰어에 로그가 안 보여요

**증상**: 로그 뷰어를 열었는데 "로그가 없습니다" 표시

**해결 방법**:
```
1. 새로고침 버튼 (🔄) 클릭
2. 필터가 너무 좁게 설정되어 있는지 확인
   - Level: "ALL"로 변경
   - Category: "ALL"로 변경
3. 브라우저 IndexedDB 확인
   - F12 → Application 탭 → IndexedDB → ResearchAgentLogs
```

### 문제 2: 서버 로그 파일이 생성되지 않아요

**증상**: `logs/` 폴더가 없거나 비어있음

**해결 방법**:
```bash
# 1. logs 폴더 생성
mkdir -p /Users/jokull/dev/claude_code/search_previous_car_251201/research-agent/logs

# 2. 권한 확인
ls -la logs/

# 3. 서버 재시작
npm run dev

# 4. 테스트 질문 보내기
# 5. logs 폴더 확인
ls logs/
```

### 문제 3: API 요청이 실패해요

**증상**: `/api/logs` 호출 시 500 에러

**해결 방법**:
```bash
# 1. 서버 로그 확인
# 터미널에서 에러 메시지 확인

# 2. 로그 디렉토리 권한 확인
ls -la logs/

# 3. 환경 변수 확인
echo $LOG_DIR

# 4. 서버 재시작
```

### 문제 4: Export한 파일이 한글이 깨져요

**증상**: CSV 파일을 Excel에서 열면 한글이 깨짐

**해결 방법**:
```
Excel에서 열 때:
1. 데이터 탭 → 텍스트/CSV 가져오기
2. 파일 선택
3. "파일 원본" → "65001: Unicode (UTF-8)" 선택
4. 구분 기호: 쉼표(,) 선택
5. 마침
```

### 문제 5: IndexedDB 용량이 가득 찼어요

**증상**: 로그가 더 이상 저장되지 않음

**해결 방법**:
```
1. 로그 뷰어 열기
2. 우측 하단 "🗑️ (휴지통)" 버튼 클릭
3. "모든 로그를 삭제하시겠습니까?" → 확인

또는 브라우저 개발자 도구에서:
F12 → Application → IndexedDB → ResearchAgentLogs 우클릭 → Delete database
```

---

## 자주 묻는 질문 (FAQ)

### Q1: 로그는 얼마나 오래 보관되나요?

**브라우저 (IndexedDB)**:
- 최대 10,000개 로그
- 최대 7일간 보관
- 초과 시 오래된 로그 자동 삭제

**서버 (파일)**:
- 무제한 보관 (디스크 용량까지)
- 수동으로 관리 필요
- 오래된 파일 직접 삭제 권장

### Q2: 로그에 민감한 정보가 저장되나요?

**저장되는 정보**:
- 사용자 질문 내용
- AI 답변 내용
- API 요청/응답 메타데이터

**저장되지 않는 정보**:
- API 키 (마스킹됨)
- 비밀번호
- 개인 식별 정보 (별도 처리 필요)

**주의사항**:
Beta 테스트 시 사용자에게 "대화 내용이 서비스 개선을 위해 저장됨"을 고지하고 동의 받으세요.

### Q3: 프로덕션 환경에서는 어떻게 설정하나요?

```typescript
// lib/logger.ts
// 프로덕션에서는 WARN 이상만 로깅
const config = {
  minLevel: process.env.NODE_ENV === 'production' ? 'WARN' : 'DEBUG',
  enableConsole: process.env.NODE_ENV !== 'production',
  enableIndexedDB: true,
  enableServer: true,
};
```

### Q4: 로그 파일 크기가 너무 커요. 어떻게 관리하나요?

**로그 로테이션 (수동)**:
```bash
# 오래된 로그 압축
gzip logs/2025-12-01.log

# 30일 이상 된 로그 삭제
find logs/ -name "*.log" -mtime +30 -delete

# 압축된 로그만 남기기
find logs/ -name "*.log" -mtime +7 -exec gzip {} \;
```

### Q5: 여러 서버에서 로그를 수집하고 싶어요

**방법 1: 로그 집계 서비스 사용**
- Elasticsearch + Kibana
- Grafana Loki
- 사내 로그 서버

**방법 2: 파일 동기화**
```bash
# rsync로 중앙 서버에 동기화
rsync -avz logs/ central-server:/var/logs/research-agent/
```

---

## 추가 리소스

### 관련 문서
- [README.md](./README.md) - 프로젝트 개요
- [ARCHITECTURE.md](../ARCHITECTURE.md) - 전체 아키텍처

### 코드 참고
- [lib/logger.ts](./lib/logger.ts) - Logger 구현
- [lib/log-storage.ts](./lib/log-storage.ts) - IndexedDB 저장소
- [app/api/logs/route.ts](./app/api/logs/route.ts) - 로그 API
- [components/log-viewer.tsx](./components/log-viewer.tsx) - 로그 뷰어 UI

---

## 요약

### 빠른 참조

**일반 사용자 (디버깅)**:
```
→ 브라우저 로그 뷰어 (📄 버튼) 사용
```

**개발자 (실시간 모니터링)**:
```
→ 개발자 콘솔 (F12) 사용
```

**관리자 (Beta 분석)**:
```bash
→ curl "http://localhost:3000/api/admin/threads?format=csv" -o analysis.csv
→ Excel에서 분석
```

**서버 관리자 (전체 로그)**:
```bash
→ tail -f logs/2025-12-08.log
→ grep "ERROR" logs/*.log
```

---

**마지막 업데이트**: 2025-12-08
