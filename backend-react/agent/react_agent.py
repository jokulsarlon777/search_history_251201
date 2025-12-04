"""
ReAct Agent Implementation using LangGraph
"""
import os
import time
import logging
from typing import Literal
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

# 환경 변수 로드
load_dotenv()
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage
from langgraph.graph import StateGraph, END

from agent.state import AgentState
from tools import elasticsearch_search
from tools.elasticsearch_tool import ElasticsearchConfig

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ToolNode 직접 구현
def call_tools(state: AgentState) -> dict:
    """도구를 실행하는 노드"""
    start_time = time.time()
    messages = state["messages"]
    last_message = messages[-1]

    tool_calls = last_message.tool_calls
    tool_messages = []

    logger.info(f"🔧 Tool calls: {len(tool_calls)} tools to execute")

    # 각 도구 호출 실행
    for tool_call in tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]

        logger.info(f"🔨 Executing tool: {tool_name} with args: {tool_args}")
        tool_start = time.time()

        # 도구 호출 정보를 포함한 메시지 생성
        tool_info = f"\n🔧 **Tool 호출 정보:**\n"
        tool_info += f"- 도구: `{tool_name}`\n"
        tool_info += f"- 파라미터:\n"
        for key, value in tool_args.items():
            tool_info += f"  - {key}: `{value}`\n"
        tool_info += "\n---\n\n"

        # 도구 실행
        try:
            if tool_name == "elasticsearch_search":
                result = elasticsearch_search.invoke(tool_args)
            else:
                result = f"Unknown tool: {tool_name}"
                logger.error(f"❌ Unknown tool requested: {tool_name}")
        except Exception as e:
            result = f"Error executing tool {tool_name}: {str(e)}"
            logger.error(f"❌ Tool execution error: {str(e)}")

        tool_duration = time.time() - tool_start
        logger.info(f"✅ Tool {tool_name} completed in {tool_duration:.2f}s")

        # 도구 호출 정보 + 결과를 함께 포함
        full_result = tool_info + str(result)

        # 도구 메시지 생성
        tool_messages.append(
            ToolMessage(
                content=full_result,
                tool_call_id=tool_call["id"]
            )
        )

    total_duration = time.time() - start_time
    logger.info(f"📊 All tools executed in {total_duration:.2f}s")

    return {"messages": tool_messages}


def generate_reasoning_prompt() -> str:
    """Generate REASONING_PROMPT with available indices from configuration"""
    try:
        config = ElasticsearchConfig()

        # 사용 가능한 인덱스 목록 생성
        index_descriptions = []
        for index_name, index_config in config.index_configs.items():
            display_name = index_config.get("display_name", index_name)
            description = index_config.get("description", "")
            index_descriptions.append(f'"{index_name}" ({display_name}): {description}')

        indices_info = "\n   - ".join(index_descriptions) if index_descriptions else "설정된 인덱스가 없습니다"

        return f"""당신은 Elasticsearch를 활용하여 정보를 검색하는 AI입니다.

## 도구
- **elasticsearch_search**: 키워드로 검색
   사용 가능한 인덱스:
   - {indices_info}

## 응답 형식

### 🤔 Thinking
[1-2문장으로 검색 계획 간단히 작성]

위 계획대로 도구를 호출하세요."""
    except Exception as e:
        logger.error(f"❌ Failed to generate reasoning prompt: {e}")
        # 폴백 프롬프트
        return """당신은 Elasticsearch를 활용하여 정보를 검색하는 AI입니다.

## 도구
- **elasticsearch_search**: 키워드로 검색

## 응답 형식

### 🤔 Thinking
[1-2문장으로 검색 계획 간단히 작성]

위 계획대로 도구를 호출하세요."""


# System prompts for different stages
REASONING_PROMPT = generate_reasoning_prompt()

ANSWER_PROMPT = """검색 결과를 바탕으로 사용자에게 정확하고 구조화된 답변을 제공하세요.

## **STEP 2: 답변 작성 (검색 완료 후)**

반드시 다음 Markdown 형식을 따르세요:

### 📊 검색 결과 요약
- 총 N개의 결과를 찾았습니다

### 🔍 상세 내용
[검색 결과를 구조화하여 표시]
- 차량 문제: 차종, 시스템, 문제점, 원인, 대책을 명확히 정리
- 기술 문서: 주요 내용을 bullet point로 정리

### 💡 결론
[검색 결과를 바탕으로 한 종합적인 답변]

### 🔍 추가로 궁금하실 수 있는 질문
[이 답변과 관련하여 사용자가 추가로 궁금해할 만한 구체적인 질문 3개를 제안하세요]
1. [관련 질문 1]
2. [관련 질문 2]
3. [관련 질문 3]

답변은 항상 한국어로 제공하세요."""


def create_react_agent():
    """
    ReAct 에이전트 그래프를 생성합니다.

    Returns:
        컴파일된 LangGraph 그래프
    """
    # LLM 초기화
    llm = ChatOpenAI(
        model="gpt-4o-mini",  # 빠른 응답을 위해 mini 모델 사용
        temperature=0,
        streaming=True,
    )

    # 도구 바인딩
    tools = [elasticsearch_search]
    llm_with_tools = llm.bind_tools(tools)

    # 노드 함수 정의
    def call_model(state: AgentState) -> dict:
        """LLM을 호출하여 다음 액션 결정"""
        start_time = time.time()
        from langchain_core.messages import AIMessage
        messages = state["messages"]

        # 마지막 메시지가 도구 결과인지 확인
        last_message = messages[-1] if messages else None
        is_after_tool = isinstance(last_message, ToolMessage)

        if is_after_tool:
            # STEP 3: 도구 실행 후 - 최종 답변 생성
            logger.info("📝 Generating final answer based on tool results")
            answer_start = time.time()

            messages_for_answer = [SystemMessage(content=ANSWER_PROMPT)] + [
                m for m in messages if not isinstance(m, SystemMessage)
            ]
            response = llm.invoke(messages_for_answer)

            answer_duration = time.time() - answer_start
            logger.info(f"✅ Answer generated in {answer_duration:.2f}s")
            logger.info(f"📊 Total call_model duration: {time.time() - start_time:.2f}s")

            return {"messages": [response]}
        else:
            # STEP 1 & 2를 분리: Thinking 먼저, 그 다음 도구 호출
            logger.info("🤔 Starting thinking phase")
            thinking_start = time.time()

            # 먼저 Thinking만 생성 (도구 없이)
            messages_for_thinking = [SystemMessage(content=REASONING_PROMPT)] + [
                m for m in messages if not isinstance(m, SystemMessage)
            ]
            thinking_response = llm.invoke(messages_for_thinking)

            thinking_duration = time.time() - thinking_start
            logger.info(f"💡 Thinking completed in {thinking_duration:.2f}s")

            # Thinking 응답을 메시지에 추가
            messages_with_thinking = messages + [thinking_response]

            # 이제 도구 호출 생성
            logger.info("🔧 Generating tool calls")
            tool_call_start = time.time()

            tool_prompt = SystemMessage(content="이전 Thinking을 바탕으로 적절한 도구를 호출하세요. 텍스트 응답 없이 도구만 호출하세요.")
            messages_for_tools = [tool_prompt] + [
                m for m in messages_with_thinking if not isinstance(m, SystemMessage)
            ]
            tool_response = llm_with_tools.invoke(messages_for_tools)

            tool_call_duration = time.time() - tool_call_start
            num_tool_calls = len(tool_response.tool_calls) if hasattr(tool_response, 'tool_calls') else 0
            logger.info(f"🔨 Tool calls generated ({num_tool_calls} calls) in {tool_call_duration:.2f}s")
            logger.info(f"📊 Total call_model duration: {time.time() - start_time:.2f}s")

            # 두 응답을 모두 반환
            return {"messages": [thinking_response, tool_response]}

    def should_continue(state: AgentState) -> Literal["tools", "end"]:
        """도구 호출이 필요한지 판단"""
        last_message = state["messages"][-1]

        # 도구 호출이 있으면 tools 노드로, 없으면 종료
        if last_message.tool_calls:
            return "tools"
        return "end"

    # 그래프 구성
    workflow = StateGraph(AgentState)

    # 노드 추가
    workflow.add_node("agent", call_model)
    workflow.add_node("tools", call_tools)

    # 엣지 추가
    workflow.set_entry_point("agent")
    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {
            "tools": "tools",
            "end": END,
        }
    )
    workflow.add_edge("tools", "agent")

    # 그래프 컴파일 (LangGraph API가 자동으로 persistence 제공)
    return workflow.compile()


# 에이전트 인스턴스 생성
react_agent = create_react_agent()
