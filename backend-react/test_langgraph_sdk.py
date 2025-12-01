"""
Test the LangGraph API using LangGraph SDK (Python version)
This simulates how the frontend calls the API
"""
import asyncio
from langgraph_sdk import get_client

async def test_with_sdk():
    """Test using LangGraph SDK (matches frontend behavior)"""

    # Create client (matches frontend createLangGraphClient)
    client = get_client(url="http://127.0.0.1:2025")

    # Create a thread
    thread = await client.threads.create()
    print(f"✅ Created thread: {thread['thread_id']}")

    # Test query
    query = "LangGraph에 대해 검색해줘"
    print(f"\n질문: {query}\n")

    # Stream the response (matches frontend streamMessage)
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
        "react_agent",  # This is the graph_id
        input=input_data,
        stream_mode=["values", "updates", "messages"]
    )

    async for chunk in stream:
        # Print chunk type and data
        if chunk.event == "values":
            messages = chunk.data.get("messages", [])
            if messages:
                last_message = messages[-1]
                if hasattr(last_message, "content"):
                    print(f"\n{last_message.content}")
        elif chunk.event == "updates":
            print(f"🔄 Update: {chunk.data}")

    print("=" * 60)
    print("✅ Test completed successfully!")

if __name__ == "__main__":
    asyncio.run(test_with_sdk())
