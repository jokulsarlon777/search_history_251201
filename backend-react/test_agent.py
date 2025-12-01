"""
Test script for ReAct agent
"""
import asyncio
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from agent import react_agent

# 환경 변수 로드
load_dotenv()


async def test_react_agent():
    """ReAct 에이전트 테스트"""

    # 테스트 입력
    test_queries = [
        "사용 가능한 인덱스를 보여줘",
        "LangGraph에 대해 검색해줘",
        "최근 문서들을 찾아줘"
    ]

    for query in test_queries:
        print(f"\n{'='*60}")
        print(f"질문: {query}")
        print(f"{'='*60}\n")

        # 에이전트 실행
        config = {"configurable": {"thread_id": "test-thread"}}
        inputs = {"messages": [HumanMessage(content=query)]}

        async for event in react_agent.astream_events(inputs, config=config, version="v2"):
            kind = event["event"]

            # LLM 스트리밍 출력
            if kind == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    print(content, end="", flush=True)

            # 도구 호출 시작
            elif kind == "on_tool_start":
                tool_name = event["name"]
                print(f"\n🔧 도구 사용: {tool_name}")

            # 도구 실행 완료
            elif kind == "on_tool_end":
                print(f"✅ 도구 실행 완료")

        print("\n")


if __name__ == "__main__":
    asyncio.run(test_react_agent())
