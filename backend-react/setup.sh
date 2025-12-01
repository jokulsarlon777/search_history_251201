#!/bin/bash

# Backend-React Setup Script

echo "🚀 Backend-React 설정 시작..."

# 1. Python 가상환경 생성
echo "📦 Python 가상환경 생성 중..."
python3 -m venv venv
source venv/bin/activate

# 2. 의존성 설치
echo "📥 의존성 설치 중..."
pip install --upgrade pip
pip install -r requirements.txt

# 3. .env 파일 생성 (없을 경우)
if [ ! -f .env ]; then
    echo "📝 .env 파일 생성 중..."
    cp .env.example .env
    echo "⚠️  .env 파일을 수정하여 API 키와 Elasticsearch 설정을 입력하세요"
fi

# 4. 설정 확인
echo ""
echo "✅ 설정 완료!"
echo ""
echo "다음 단계:"
echo "1. .env 파일에 API 키 설정"
echo "2. Elasticsearch 서버 실행 확인"
echo "3. 'langgraph dev' 명령으로 서버 실행"
echo ""
