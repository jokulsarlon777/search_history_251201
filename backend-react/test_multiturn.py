"""
Test multi-turn conversation with React Agent
"""
import asyncio
from langgraph_sdk import get_client

async def test_multiturn():
    """Test multi-turn conversation"""

    # Create client
    client = get_client(url="http://127.0.0.1:2025")

    # Create a thread (persistent conversation)
    thread = await client.threads.create()
    print(f"✅ Created thread: {thread['thread_id']}")

    # First turn
    query1 = "차량 브레이크 문제점 검색해줘"
    print(f"\n[턴 1] 질문: {query1}\n")

    input_data1 = {
        "messages": [
            {
                "role": "user",
                "content": query1
            }
        ]
    }

    stream1 = client.runs.stream(
        thread["thread_id"],
        "react_agent",
        input=input_data1,
        stream_mode=["values"]
    )

    async for chunk in stream1:
        if chunk.event == "values":
            messages = chunk.data.get("messages", [])
            if messages:
                last_message = messages[-1]
                if hasattr(last_message, "content") and last_message.content and hasattr(last_message, "type"):
                    if last_message.type == "ai":
                        print(f"\n[턴 1] AI 답변 (메시지 총 {len(messages)}개):\n{last_message.content[:200]}...")

    print("\n" + "="*60)

    # Wait a bit
    await asyncio.sleep(2)

    # Second turn - follow-up question
    query2 = "K5의 문제만 자세히 알려줘"
    print(f"\n[턴 2] 질문: {query2}\n")

    input_data2 = {
        "messages": [
            {
                "role": "user",
                "content": query2
            }
        ]
    }

    stream2 = client.runs.stream(
        thread["thread_id"],
        "react_agent",
        input=input_data2,
        stream_mode=["values"]
    )

    async for chunk in stream2:
        if chunk.event == "values":
            messages = chunk.data.get("messages", [])
            if messages:
                last_message = messages[-1]
                if hasattr(last_message, "content") and last_message.content and hasattr(last_message, "type"):
                    if last_message.type == "ai":
                        print(f"\n[턴 2] AI 답변 (메시지 총 {len(messages)}개):\n{last_message.content}")

    print("\n" + "="*60)

    # Check thread state to verify persistence
    state = await client.threads.get_state(thread["thread_id"])
    total_messages = len(state["values"]["messages"])
    print(f"\n✅ Thread has {total_messages} total messages (should be ~8-10 for 2 turns)")
    print(f"✅ Multi-turn conversation working: {'YES' if total_messages > 5 else 'NO'}")

if __name__ == "__main__":
    asyncio.run(test_multiturn())
