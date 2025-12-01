"""
State definition for ReAct agent
"""
from typing import Annotated, TypedDict, List
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """
    ReAct 에이전트의 상태를 정의합니다.

    Attributes:
        messages: 대화 메시지 목록 (자동으로 추가됨)
    """
    messages: Annotated[List[BaseMessage], add_messages]
