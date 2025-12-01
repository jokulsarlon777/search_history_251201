"""
Sample data script to populate Elasticsearch with test documents
"""
import os
from dotenv import load_dotenv
from elasticsearch import Elasticsearch
from datetime import datetime

# 환경 변수 로드
load_dotenv()


def create_sample_data():
    """Elasticsearch에 샘플 데이터를 추가합니다."""

    # Elasticsearch 클라이언트 생성
    es = Elasticsearch(
        [os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")],
        basic_auth=(
            os.getenv("ELASTICSEARCH_USERNAME", "elastic"),
            os.getenv("ELASTICSEARCH_PASSWORD", "")
        ) if os.getenv("ELASTICSEARCH_PASSWORD") else None,
        verify_certs=False,
    )

    # 인덱스 생성 (이미 있으면 스킵)
    index_name = "documents"

    if es.indices.exists(index=index_name):
        print(f"⚠️  인덱스 '{index_name}'이 이미 존재합니다. 삭제하려면 스크립트를 수정하세요.")
    else:
        # 인덱스 매핑 정의
        mapping = {
            "mappings": {
                "properties": {
                    "title": {"type": "text"},
                    "content": {"type": "text"},
                    "description": {"type": "text"},
                    "url": {"type": "keyword"},
                    "timestamp": {"type": "date"}
                }
            }
        }
        es.indices.create(index=index_name, body=mapping)
        print(f"✅ 인덱스 '{index_name}' 생성 완료")

    # 샘플 문서 데이터
    sample_docs = [
        {
            "title": "LangGraph 소개",
            "content": """LangGraph는 LLM 기반 애플리케이션을 위한 상태 머신 프레임워크입니다.
            복잡한 에이전트 워크플로우를 그래프 구조로 정의하고 실행할 수 있습니다.
            StateGraph를 사용하여 노드와 엣지를 정의하고, 조건부 분기를 통해 동적인 흐름을 구현할 수 있습니다.""",
            "description": "LangGraph 프레임워크에 대한 기본 설명",
            "url": "https://langchain-ai.github.io/langgraph/",
            "timestamp": datetime.now()
        },
        {
            "title": "ReAct 패턴",
            "content": """ReAct는 Reasoning과 Acting을 결합한 AI 에이전트 패턴입니다.
            LLM이 사고 과정(Thought)을 거쳐 행동(Action)을 결정하고,
            도구를 실행한 후 관찰(Observation) 결과를 바탕으로 다음 단계를 결정합니다.
            이러한 순환 과정을 통해 복잡한 문제를 단계적으로 해결할 수 있습니다.""",
            "description": "ReAct 에이전트 패턴 설명",
            "url": "https://arxiv.org/abs/2210.03629",
            "timestamp": datetime.now()
        },
        {
            "title": "Elasticsearch 기본",
            "content": """Elasticsearch는 분산형 검색 및 분석 엔진입니다.
            JSON 문서를 저장하고, 전문 검색(Full-text search)을 제공합니다.
            RESTful API를 통해 데이터를 색인하고 검색할 수 있으며,
            대규모 데이터셋에서도 빠른 검색 성능을 제공합니다.""",
            "description": "Elasticsearch 검색 엔진 소개",
            "url": "https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html",
            "timestamp": datetime.now()
        },
        {
            "title": "LangChain Tools",
            "content": """LangChain Tools는 LLM이 외부 기능을 사용할 수 있게 하는 인터페이스입니다.
            @tool 데코레이터를 사용하여 Python 함수를 도구로 변환할 수 있으며,
            LLM은 이 도구들을 자동으로 호출하여 정보를 수집하거나 작업을 수행할 수 있습니다.""",
            "description": "LangChain의 도구 시스템",
            "url": "https://python.langchain.com/docs/modules/tools/",
            "timestamp": datetime.now()
        },
        {
            "title": "GPT-4o-mini 모델",
            "content": """GPT-4o-mini는 OpenAI의 경량화된 언어 모델입니다.
            GPT-4보다 빠르고 비용 효율적이면서도 높은 성능을 제공합니다.
            일반적인 대화, 요약, 번역 등의 작업에 최적화되어 있으며,
            빠른 응답 시간이 필요한 애플리케이션에 적합합니다.""",
            "description": "OpenAI GPT-4o-mini 모델 소개",
            "url": "https://platform.openai.com/docs/models/gpt-4o-mini",
            "timestamp": datetime.now()
        }
    ]

    # 문서 색인
    for i, doc in enumerate(sample_docs, 1):
        es.index(index=index_name, id=i, document=doc)
        print(f"✅ 문서 {i} 색인 완료: {doc['title']}")

    # 인덱스 새로고침 (즉시 검색 가능하도록)
    es.indices.refresh(index=index_name)

    print(f"\n🎉 총 {len(sample_docs)}개의 샘플 문서가 추가되었습니다!")
    print(f"인덱스: {index_name}")


if __name__ == "__main__":
    create_sample_data()
