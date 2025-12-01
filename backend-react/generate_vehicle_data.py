"""
Generate 100,000 realistic vehicle issue records for Elasticsearch
"""
import random
from datetime import datetime, timedelta
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
import os
from dotenv import load_dotenv

load_dotenv()

# Elasticsearch 설정
ES_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
ES_USERNAME = os.getenv("ELASTICSEARCH_USERNAME", "elastic")
ES_PASSWORD = os.getenv("ELASTICSEARCH_PASSWORD", "")

# 현실적인 데이터 패턴
VEHICLES = {
    "현대": ["Sonata", "Avante", "Grandeur", "Tucson", "SantaFe", "Kona", "Venue", "Palisade"],
    "기아": ["K3", "K5", "K7", "K8", "Sportage", "Sorento", "Carnival", "Seltos", "Niro"],
    "제네시스": ["G70", "G80", "G90", "GV70", "GV80"],
    "쌍용": ["Tivoli", "Korando", "Rexton"],
    "르노삼성": ["SM6", "QM6", "XM3"]
}

SYSTEMS = {
    "브레이크": {
        "문제점": [
            "브레이크 패드 마모",
            "브레이크 디스크 손상",
            "브레이크 오일 누유",
            "ABS 센서 오류",
            "브레이크 페달 유격",
            "브레이크 라인 부식",
            "브레이크 캘리퍼 고착"
        ],
        "현상": [
            "제동력 저하",
            "제동 시 소음",
            "페달 진동",
            "제동 거리 증가",
            "경고등 점등",
            "브레이크 끌림"
        ],
        "원인": [
            "부품 노화",
            "과도한 열",
            "부적절한 정비",
            "오일 오염",
            "센서 불량",
            "배선 문제"
        ],
        "대책": [
            "패드 교체",
            "디스크 연마",
            "오일 교환",
            "센서 교체",
            "배선 점검",
            "캘리퍼 정비"
        ]
    },
    "엔진": {
        "문제점": [
            "엔진 오일 누유",
            "점화 플러그 불량",
            "연료 분사 장치 오류",
            "타이밍 벨트 손상",
            "냉각수 누수",
            "엔진 과열",
            "배기가스 과다"
        ],
        "현상": [
            "출력 저하",
            "시동 불량",
            "진동 증가",
            "연비 저하",
            "온도 상승",
            "이상 소음"
        ],
        "원인": [
            "오일 부족",
            "부품 마모",
            "센서 고장",
            "냉각수 부족",
            "공기 필터 막힘",
            "연료 품질 불량"
        ],
        "대책": [
            "오일 보충",
            "부품 교체",
            "센서 교체",
            "냉각수 보충",
            "필터 교체",
            "정밀 점검"
        ]
    },
    "변속기": {
        "문제점": [
            "변속 충격",
            "변속 지연",
            "기어 미끄러짐",
            "오일 누유",
            "클러치 마모",
            "솔레노이드 불량"
        ],
        "현상": [
            "변속 불량",
            "이상 소음",
            "출력 저하",
            "경고등 점등",
            "연비 저하",
            "진동 발생"
        ],
        "원인": [
            "오일 부족",
            "클러치 마모",
            "전자 제어 오류",
            "배선 불량",
            "센서 고장",
            "기계적 마모"
        ],
        "대책": [
            "오일 교환",
            "클러치 교체",
            "소프트웨어 업데이트",
            "배선 수리",
            "센서 교체",
            "오버홀"
        ]
    },
    "서스펜션": {
        "문제점": [
            "쇼크 업소버 누유",
            "스프링 파손",
            "부싱 마모",
            "스태빌라이저 바 손상",
            "볼 조인트 유격",
            "타이로드 엔드 마모"
        ],
        "현상": [
            "승차감 저하",
            "핸들링 불량",
            "이상 소음",
            "차체 흔들림",
            "편마모 발생",
            "조향 불안정"
        ],
        "원인": [
            "부품 노화",
            "과적재",
            "노면 충격",
            "부싱 경화",
            "그리스 부족",
            "조립 불량"
        ],
        "대책": [
            "쇼크 업소버 교체",
            "스프링 교체",
            "부싱 교체",
            "휠 얼라인먼트",
            "그리스 주입",
            "정비 점검"
        ]
    },
    "전기장치": {
        "문제점": [
            "배터리 방전",
            "얼터네이터 고장",
            "스타터 모터 불량",
            "퓨즈 단선",
            "배선 단락",
            "센서 오류"
        ],
        "현상": [
            "시동 불가",
            "경고등 점등",
            "전장 기능 마비",
            "충전 불량",
            "라이트 깜빡임",
            "계기판 오류"
        ],
        "원인": [
            "배터리 수명",
            "과방전",
            "배선 노화",
            "접촉 불량",
            "퓨즈 소손",
            "습기 침투"
        ],
        "대책": [
            "배터리 교체",
            "얼터네이터 교체",
            "배선 수리",
            "접점 청소",
            "퓨즈 교체",
            "방수 처리"
        ]
    },
    "냉각": {
        "문제점": [
            "냉각수 누수",
            "라디에이터 막힘",
            "워터 펌프 고장",
            "서모스탯 불량",
            "냉각 팬 작동 불량",
            "히터 코어 누수"
        ],
        "현상": [
            "온도 상승",
            "냉각수 부족",
            "히터 작동 불량",
            "오버히트",
            "경고등 점등",
            "엔진 출력 저하"
        ],
        "원인": [
            "호스 노화",
            "라디에이터 부식",
            "펌프 베어링 마모",
            "서모스탯 고착",
            "팬 모터 고장",
            "실링 열화"
        ],
        "대책": [
            "호스 교체",
            "라디에이터 청소",
            "워터 펌프 교체",
            "서모스탯 교체",
            "팬 모터 교체",
            "냉각수 교환"
        ]
    },
    "연료": {
        "문제점": [
            "연료 펌프 고장",
            "연료 필터 막힘",
            "인젝터 불량",
            "연료 탱크 누유",
            "연료 라인 막힘",
            "연료 압력 이상"
        ],
        "현상": [
            "시동 불량",
            "가속 불량",
            "엔진 떨림",
            "출력 저하",
            "연비 저하",
            "공회전 불안정"
        ],
        "원인": [
            "연료 오염",
            "필터 막힘",
            "펌프 마모",
            "인젝터 막힘",
            "압력 조절기 불량",
            "연료 품질"
        ],
        "대책": [
            "펌프 교체",
            "필터 교체",
            "인젝터 세정",
            "연료 탱크 수리",
            "압력 조절",
            "연료 첨가제 사용"
        ]
    }
}

STAGES = ["설계", "개발", "테스트", "배포", "양산", "A/S"]
SEVERITY = ["경미", "보통", "심각", "긴급"]

def generate_vehicle_issues(num_records=100000):
    """Generate realistic vehicle issue records"""

    print(f"🔧 {num_records:,}개의 차량 문제점 데이터 생성 중...")

    records = []
    for i in range(num_records):
        # 랜덤하게 제조사와 차종 선택
        manufacturer = random.choice(list(VEHICLES.keys()))
        vehicle = random.choice(VEHICLES[manufacturer])

        # 랜덤하게 시스템 선택
        system = random.choice(list(SYSTEMS.keys()))
        system_data = SYSTEMS[system]

        # 해당 시스템의 문제점, 현상, 원인, 대책 선택
        issue = random.choice(system_data["문제점"])
        symptom = random.choice(system_data["현상"])
        cause = random.choice(system_data["원인"])
        solution = random.choice(system_data["대책"])

        # 기타 정보
        stage = random.choice(STAGES)
        severity = random.choice(SEVERITY)

        # 날짜 생성 (최근 2년 이내)
        days_ago = random.randint(0, 730)
        date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")

        # 주행거리 (랜덤)
        mileage = random.randint(1000, 200000)

        # VIN 번호 생성 (임의)
        vin = f"{manufacturer[:3].upper()}{vehicle[:3].upper()}{random.randint(10000000, 99999999)}"

        record = {
            "순번": i + 1,
            "제조사": manufacturer,
            "차종": vehicle,
            "시스템": system,
            "문제점내용": issue,
            "현상": symptom,
            "원인및요구안내용": cause,
            "대책조치": solution,
            "단계": stage,
            "심각도": severity,
            "발생일자": date,
            "주행거리": mileage,
            "VIN": vin
        }

        records.append(record)

        if (i + 1) % 10000 == 0:
            print(f"  진행: {i+1:,} / {num_records:,} ({(i+1)/num_records*100:.1f}%)")

    print(f"✅ {num_records:,}개 데이터 생성 완료!")
    return records

def index_to_elasticsearch(records, index_name="vehicle_issues"):
    """Bulk index records to Elasticsearch"""

    print(f"\n📤 Elasticsearch에 데이터 업로드 중...")

    # Elasticsearch 연결
    es = Elasticsearch(
        [ES_URL],
        basic_auth=(ES_USERNAME, ES_PASSWORD) if ES_PASSWORD else None,
        verify_certs=False
    )

    # 기존 인덱스 삭제
    if es.indices.exists(index=index_name):
        print(f"  기존 인덱스 '{index_name}' 삭제 중...")
        es.indices.delete(index=index_name)

    # 인덱스 매핑 설정
    mapping = {
        "mappings": {
            "properties": {
                "순번": {"type": "integer"},
                "제조사": {"type": "keyword"},
                "차종": {"type": "keyword"},
                "시스템": {"type": "keyword"},
                "문제점내용": {"type": "text", "analyzer": "standard"},
                "현상": {"type": "text", "analyzer": "standard"},
                "원인및요구안내용": {"type": "text", "analyzer": "standard"},
                "대책조치": {"type": "text", "analyzer": "standard"},
                "단계": {"type": "keyword"},
                "심각도": {"type": "keyword"},
                "발생일자": {"type": "date"},
                "주행거리": {"type": "integer"},
                "VIN": {"type": "keyword"}
            }
        }
    }

    print(f"  새 인덱스 '{index_name}' 생성 중...")
    es.indices.create(index=index_name, body=mapping)

    # Bulk 업로드를 위한 액션 생성
    def generate_actions():
        for record in records:
            yield {
                "_index": index_name,
                "_source": record
            }

    # Bulk 업로드
    success, failed = bulk(es, generate_actions(), chunk_size=1000, raise_on_error=False)

    print(f"✅ 업로드 완료: {success:,}개 성공, {len(failed):,}개 실패")

    # 인덱스 새로고침
    es.indices.refresh(index=index_name)

    # 통계 출력
    count = es.count(index=index_name)["count"]
    print(f"\n📊 최종 통계:")
    print(f"  총 문서 수: {count:,}개")

    # 제조사별 통계
    agg_result = es.search(
        index=index_name,
        body={
            "size": 0,
            "aggs": {
                "by_manufacturer": {
                    "terms": {"field": "제조사", "size": 10}
                },
                "by_system": {
                    "terms": {"field": "시스템", "size": 10}
                }
            }
        }
    )

    print("\n  제조사별 분포:")
    for bucket in agg_result["aggregations"]["by_manufacturer"]["buckets"]:
        print(f"    - {bucket['key']}: {bucket['doc_count']:,}개")

    print("\n  시스템별 분포:")
    for bucket in agg_result["aggregations"]["by_system"]["buckets"]:
        print(f"    - {bucket['key']}: {bucket['doc_count']:,}개")

if __name__ == "__main__":
    import time
    start_time = time.time()

    # 10만개 데이터 생성
    records = generate_vehicle_issues(100000)

    # Elasticsearch에 업로드
    index_to_elasticsearch(records)

    elapsed_time = time.time() - start_time
    print(f"\n⏱️  총 소요 시간: {elapsed_time:.2f}초")
