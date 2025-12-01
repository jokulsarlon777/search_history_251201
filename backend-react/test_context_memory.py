"""
Test context memory in multi-turn conversation
"""
import asyncio
from langgraph_sdk import get_client

async def test_context_memory():
    """Test if agent remembers context from previous turns"""

    client = get_client(url="http://127.0.0.1:2025")
    thread = await client.threads.create()
    print(f"✅ Created thread: {thread['thread_id']}\n")

    # Turn 1: Initial search
    print("="*60)
    print("[턴 1] 사용자: 차량 브레이크 문제점 검색해줘")
    print("="*60)

    stream1 = client.runs.stream(
        thread["thread_id"],
        "react_agent",
        input={"messages": [{"role": "user", "content": "차량 브레이크 문제점 검색해줘"}]},
        stream_mode=["values"]
    )

    turn1_response = ""
    async for chunk in stream1:
        if chunk.event == "values":
            messages = chunk.data.get("messages", [])
            if messages:
                last_msg = messages[-1]
                if hasattr(last_msg, "content") and hasattr(last_msg, "type") and last_msg.type == "ai":
                    turn1_response = last_msg.content

    if turn1_response:
        print(f"\n[AI 답변]")
        print(turn1_response[:500] + "...\n" if len(turn1_response) > 500 else turn1_response + "\n")

    await asyncio.sleep(2)

    # Turn 2: Follow-up question that requires context
    print("="*60)
    print("[턴 2] 사용자: K5만 자세히 알려줘")
    print("="*60)

    stream2 = client.runs.stream(
        thread["thread_id"],
        "react_agent",
        input={"messages": [{"role": "user", "content": "K5만 자세히 알려줘"}]},
        stream_mode=["values"]
    )

    turn2_response = ""
    async for chunk in stream2:
        if chunk.event == "values":
            messages = chunk.data.get("messages", [])
            if messages:
                last_msg = messages[-1]
                if hasattr(last_msg, "content") and hasattr(last_msg, "type") and last_msg.type == "ai":
                    turn2_response = last_msg.content

    if turn2_response:
        print(f"\n[AI 답변]")
        print(turn2_response + "\n")

    # Verification
    print("="*60)
    print("🔍 문맥 기억 검증")
    print("="*60)

    state = await client.threads.get_state(thread["thread_id"])
    total_messages = len(state["values"]["messages"])

    # Check if agent referenced previous context
    context_keywords = ["이전", "앞서", "위에서", "K5"]
    has_context_reference = any(keyword in turn2_response for keyword in context_keywords)

    print(f"✅ 총 메시지 수: {total_messages}")
    print(f"✅ 문맥 참조 확인: {'YES - Agent referenced previous conversation' if has_context_reference else 'NO'}")
    print(f"✅ K5 언급 확인: {'YES' if 'K5' in turn2_response else 'NO'}")

    # Check if agent avoided re-searching (should use previous results)
    avoided_duplicate_search = "검색" not in turn2_response.lower() or "이전" in turn2_response.lower()
    print(f"✅ 중복 검색 방지: {'YES - Used previous results' if avoided_duplicate_search else 'NO'}")

if __name__ == "__main__":
    asyncio.run(test_context_memory())
