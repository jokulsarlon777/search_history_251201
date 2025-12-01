"""
Test vehicle brake search
"""
import asyncio
from langgraph_sdk import get_client

async def test_vehicle_search():
    """Test vehicle brake search"""

    # Create client
    client = get_client(url="http://127.0.0.1:2025")

    # Create a thread
    thread = await client.threads.create()
    print(f"✅ Created thread: {thread['thread_id']}")

    # Test query
    query = "차량 브레이크문제점 검색해줘"
    print(f"\n질문: {query}\n")

    # Stream the response
    input_data = {
        "messages": [
            {
                "role": "user",
                "content": query
            }
        ]
    }

    print("응답:")
    print("=" * 60)

    # Stream with the correct assistant_id
    stream = client.runs.stream(
        thread["thread_id"],
        "react_agent",
        input=input_data,
        stream_mode=["values", "updates"]
    )

    async for chunk in stream:
        if chunk.event == "values":
            messages = chunk.data.get("messages", [])
            if messages:
                last_message = messages[-1]
                if hasattr(last_message, "content") and last_message.content:
                    print(f"\n최종 메시지:\n{last_message.content}")
        elif chunk.event == "updates":
            print(f"📦 Update: {chunk.data}")

    print("=" * 60)
    print("✅ Test completed!")

if __name__ == "__main__":
    asyncio.run(test_vehicle_search())
