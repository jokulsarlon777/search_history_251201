"""
Elasticsearch search tool for ReAct agent
"""
import os
import json
import time
import logging
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
from elasticsearch import Elasticsearch

# 환경 변수 로드
load_dotenv()
from langchain_core.tools import tool
from pydantic import BaseModel, Field

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ElasticsearchConfig:
    """Elasticsearch connection configuration"""

    def __init__(self):
        self.url = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
        self.username = os.getenv("ELASTICSEARCH_USERNAME", "elastic")
        self.password = os.getenv("ELASTICSEARCH_PASSWORD", "")
        self.default_index = os.getenv("ES_DEFAULT_INDEX", "documents")
        self.index_config_file = os.getenv("ES_INDEX_CONFIG_FILE", "config/es_indices.json")

        # 인덱스 설정 로드
        self.index_configs = self._load_index_configs()

    def get_client(self) -> Elasticsearch:
        """Create Elasticsearch client"""
        return Elasticsearch(
            [self.url],
            basic_auth=(self.username, self.password) if self.password else None,
            verify_certs=False,
        )

    def _load_index_configs(self) -> dict:
        """Load index configurations from JSON file"""
        try:
            with open(self.index_config_file, 'r', encoding='utf-8') as f:
                configs = json.load(f)
                logger.info(f"✅ Loaded index configurations for: {', '.join(configs.keys())}")
                return configs
        except FileNotFoundError:
            logger.warning(f"⚠️ Index config file not found: {self.index_config_file}")
            logger.warning("Using default index configuration")
            return {}
        except json.JSONDecodeError as e:
            logger.error(f"❌ Invalid JSON in index config: {e}")
            return {}

    def get_index_config(self, index_name: str) -> Optional[dict]:
        """Get configuration for specific index"""
        config = self.index_configs.get(index_name)
        if not config:
            logger.warning(f"⚠️ No configuration found for index: {index_name}")
        return config

    def get_available_indices(self) -> List[str]:
        """Get list of configured indices"""
        return list(self.index_configs.keys())


class SearchInput(BaseModel):
    """Input schema for search tool"""
    query: str = Field(description="검색어 또는 질문")
    index: Optional[str] = Field(default=None, description="검색할 인덱스 이름 (미지정 시 기본 인덱스 사용)")
    max_results: int = Field(default=5, description="반환할 최대 결과 수")


@tool("elasticsearch_search", args_schema=SearchInput)
def elasticsearch_search(query: str, index: Optional[str] = None, max_results: int = 5) -> str:
    """
    Elasticsearch에서 관련 문서를 검색합니다.

    Args:
        query: 검색어 또는 질문
        index: 검색할 인덱스 이름 (미지정 시 환경 변수의 기본 인덱스 사용)
        max_results: 반환할 최대 결과 수 (기본값: 5)

    Returns:
        검색 결과를 포함한 문자열
    """
    start_time = time.time()

    try:
        config = ElasticsearchConfig()
        es_client = config.get_client()

        # 인덱스가 지정되지 않았으면 기본 인덱스 사용
        if index is None:
            index = config.default_index
            logger.info(f"📌 Using default index: {index}")

        logger.info(f"🔍 Elasticsearch search started - Query: '{query}', Index: {index}, Max results: {max_results}")

        # 인덱스 존재 확인
        if not es_client.indices.exists(index=index):
            logger.warning(f"⚠️ Index '{index}' does not exist")
            return f"❌ 인덱스 '{index}'가 존재하지 않습니다."

        # 설정 파일에서 인덱스 설정 로드
        index_config = config.get_index_config(index)
        if not index_config:
            available_indices = config.get_available_indices()
            logger.error(f"❌ No configuration found for index '{index}'")
            return f"❌ 인덱스 '{index}'에 대한 설정을 찾을 수 없습니다.\n사용 가능한 인덱스: {', '.join(available_indices)}"

        # 설정에서 필드 정보 가져오기
        search_fields = index_config.get("search_fields", [])
        source_fields = index_config.get("source_fields", [])

        if not search_fields:
            logger.error(f"❌ No search fields configured for index '{index}'")
            return f"❌ 인덱스 '{index}'에 검색 필드가 설정되어 있지 않습니다."

        # 검색 쿼리 실행
        search_body = {
            "query": {
                "multi_match": {
                    "query": query,
                    "fields": search_fields,
                    "type": "best_fields",
                    "fuzziness": "AUTO"
                }
            },
            "size": max_results,
            "_source": source_fields
        }

        query_start = time.time()
        response = es_client.search(index=index, body=search_body)
        query_duration = time.time() - query_start

        # 결과 포맷팅
        hits = response["hits"]["hits"]
        total_hits = response["hits"]["total"]["value"] if isinstance(response["hits"]["total"], dict) else response["hits"]["total"]

        logger.info(f"📊 Search completed in {query_duration:.3f}s - Found {total_hits} total matches, returning {len(hits)} results")

        if not hits:
            logger.info(f"🔍 No results found for query: '{query}'")
            return f"🔍 '{query}'에 대한 검색 결과가 없습니다."

        # 검색 결과 점수 분석
        scores = [hit["_score"] for hit in hits]
        avg_score = sum(scores) / len(scores)
        logger.info(f"📈 Score stats - Min: {min(scores):.2f}, Max: {max(scores):.2f}, Avg: {avg_score:.2f}")

        results = []
        results.append(f"🔍 검색 결과 ({len(hits)}개):\n")

        # 결과 포맷 설정 가져오기
        result_format = index_config.get("result_format", {})
        format_type = result_format.get("type", "document")

        for i, hit in enumerate(hits, 1):
            source = hit["_source"]
            score = hit["_score"]

            # 설정 기반 결과 포맷팅
            if format_type == "vehicle":
                # 차량 이슈 포맷
                title_fields = result_format.get("title_fields", [])
                title_parts = [source.get(field, 'N/A') for field in title_fields]
                title = " - ".join(title_parts)

                content_fields = result_format.get("content_fields", {})
                content_parts = []
                for label, field in content_fields.items():
                    value = source.get(field, 'N/A')
                    content_parts.append(f"{label}: {value}")
                content = "\n   ".join(content_parts)
                url = ""
            else:
                # 문서 포맷
                title_field = result_format.get("title_field", "title")
                content_field = result_format.get("content_field", "content")
                url_field = result_format.get("url_field", "url")

                title = source.get(title_field, "제목 없음")
                content = source.get(content_field, "")
                url = source.get(url_field, "")

            # 내용 요약 (처음 300자)
            content_preview = content[:300] + "..." if len(content) > 300 else content

            result_text = f"\n[{i}] {title} (점수: {score:.2f})\n"
            result_text += f"   내용:\n   {content_preview}\n"
            if url:
                result_text += f"   URL: {url}\n"

            results.append(result_text)

        total_duration = time.time() - start_time
        logger.info(f"✅ Search completed successfully in {total_duration:.3f}s")

        return "".join(results)

    except Exception as e:
        error_msg = str(e)
        total_duration = time.time() - start_time
        logger.error(f"❌ Search failed after {total_duration:.3f}s - Error: {error_msg}")

        # Provide more specific error messages
        if "ConnectionError" in error_msg or "Connection refused" in error_msg:
            return f"❌ Elasticsearch 연결 실패: 서버가 실행 중인지 확인해주세요"
        elif "ConnectionTimeout" in error_msg or "timeout" in error_msg.lower():
            return f"❌ Elasticsearch 응답 시간 초과: 서버가 응답하지 않습니다"
        elif "AuthenticationException" in error_msg or "401" in error_msg:
            return f"❌ Elasticsearch 인증 실패: 사용자명 또는 비밀번호를 확인해주세요"
        elif "index_not_found" in error_msg.lower():
            return f"❌ 인덱스 '{index}'를 찾을 수 없습니다. 사용 가능한 인덱스를 확인해주세요"
        else:
            return f"❌ Elasticsearch 검색 중 오류 발생: {error_msg}"


@tool("list_elasticsearch_indices")
def list_elasticsearch_indices() -> str:
    """
    사용 가능한 Elasticsearch 인덱스 목록을 가져옵니다.

    Returns:
        인덱스 목록을 포함한 문자열
    """
    try:
        config = ElasticsearchConfig()
        es_client = config.get_client()

        indices = es_client.indices.get_alias(index="*")

        if not indices:
            return "❌ 사용 가능한 인덱스가 없습니다."

        result = "📚 사용 가능한 인덱스:\n\n"
        for index_name in sorted(indices.keys()):
            if not index_name.startswith('.'):  # 시스템 인덱스 제외
                result += f"  • {index_name}\n"

        return result

    except Exception as e:
        error_msg = str(e)

        # Provide more specific error messages
        if "ConnectionError" in error_msg or "Connection refused" in error_msg:
            return f"❌ Elasticsearch 연결 실패: 서버가 실행 중인지 확인해주세요"
        elif "ConnectionTimeout" in error_msg or "timeout" in error_msg.lower():
            return f"❌ Elasticsearch 응답 시간 초과: 서버가 응답하지 않습니다"
        elif "AuthenticationException" in error_msg or "401" in error_msg:
            return f"❌ Elasticsearch 인증 실패: 사용자명 또는 비밀번호를 확인해주세요"
        else:
            return f"❌ 인덱스 목록 조회 중 오류 발생: {error_msg}"


# Export tools
__all__ = ["elasticsearch_search", "list_elasticsearch_indices"]
