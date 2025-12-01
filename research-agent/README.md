# AI Research Agent

LangGraph 기반 심층 리서치 AI 에이전트 웹 애플리케이션

## 특징

- **깔끔한 아키텍처**: 처음부터 최적의 방식으로 설계
- **최신 기술 스택**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **shadcn/ui**: 일관되고 아름다운 UI 컴포넌트
- **Zustand**: 간결한 상태 관리
- **LangGraph SDK**: 실시간 스트리밍 지원
- **듀얼 에이전트 모드**: React Agent (기본) + Deep Research (심층 분석)
- **스마트 캐싱**: React Agent 응답 자동 캐싱 (1시간 TTL)
- **Thread 관리**: 과거 대화 세션 저장, 불러오기, 삭제
- **다크 모드**: next-themes를 통한 테마 전환
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원
- **마크다운 지원**: 코드 블록, 테이블, 리스트 등 완벽 렌더링

## 프로젝트 구조

```
research-agent/
├── app/                    # Next.js 앱 라우터
│   ├── globals.css        # 글로벌 스타일 (Tailwind v4)
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx           # 메인 페이지
├── components/            # React 컴포넌트
│   ├── ui/               # shadcn/ui 컴포넌트
│   ├── chat-message.tsx  # 챗 메시지 컴포넌트
│   ├── chat-input.tsx    # 챗 입력 컴포넌트
│   ├── thread-sidebar.tsx # Thread 관리 사이드바
│   └── theme-provider.tsx
├── lib/                  # 유틸리티 및 헬퍼
│   ├── langgraph.ts     # LangGraph SDK 통합
│   ├── types.ts         # TypeScript 타입 정의
│   └── utils.ts         # 유틸리티 함수
└── store/               # 상태 관리
    └── app-store.ts     # Zustand 스토어
```

## 시작하기

### 1. 환경 변수 설정

`.env.local` 파일을 확인하고 필요시 수정:

```bash
# React Agent (기본 모드 - 빠른 응답)
NEXT_PUBLIC_REACT_AGENT_URL=http://127.0.0.1:2025
NEXT_PUBLIC_REACT_ASSISTANT_ID=react_agent

# Deep Research Agent (심층 분석 모드)
NEXT_PUBLIC_LANGGRAPH_URL=http://127.0.0.1:2024
NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID=Deep Researcher
NEXT_PUBLIC_LANGGRAPH_API_KEY=
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

### 4. 프로덕션 빌드

```bash
npm run build
npm start
```

## 주요 개선사항 (기존 앱 대비)

### 아키텍처
- ✅ 처음부터 shadcn/ui로 구축 (CSS 모듈 불필요)
- ✅ 깔끔한 폴더 구조
- ✅ 타입 안정성 강화
- ✅ 더 나은 코드 분리

### UI/UX
- ✅ 일관된 디자인 시스템
- ✅ 부드러운 애니메이션
- ✅ 직관적인 인터페이스
- ✅ 완벽한 다크 모드 지원

### 성능
- ✅ 최적화된 번들 크기
- ✅ 효율적인 렌더링
- ✅ 빠른 빌드 시간

### 코드 품질
- ✅ 명확한 네이밍
- ✅ 재사용 가능한 컴포넌트
- ✅ 타입 안정성
- ✅ ESLint/Prettier 지원

## 기술 스택

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: React 19, shadcn/ui
- **Styling**: Tailwind CSS v4
- **State**: Zustand
- **AI**: LangGraph SDK
- **Theme**: next-themes
- **Icons**: lucide-react
- **Markdown**: react-markdown, remark-gfm

## 라이선스

MIT
