"""
Test what streaming events are emitted by React Agent
"""
import asyncio
from langgraph_sdk import get_client

async def test_streaming_events():
    """Test streaming events to understand what's available"""

    client = get_client(url="http://127.0.0.1:2025")
    thread = await client.threads.create()
    print(f"✅ Created thread: {thread['thread_id']}\n")

    query = "K5 브레이크 문제 검색해줘"
    print(f"Query: {query}\n")
    print("=" * 60)

    stream = client.runs.stream(
        thread["thread_id"],
        "react_agent",
        input={"messages": [{"role": "user", "content": query}]},
        stream_mode=["values", "updates", "messages"]
    )

    async for chunk in stream:
        print(f"\n🔹 Event: {chunk.event}")
        print(f"Data type: {type(chunk.data)}")

        if chunk.event == "metadata":
            print(f"Metadata: {chunk.data}")

        elif chunk.event == "updates":
            print(f"Updates keys: {chunk.data.keys() if isinstance(chunk.data, dict) else 'Not a dict'}")
            if isinstance(chunk.data, dict):
                for node_name, node_data in chunk.data.items():
                    print(f"\n  Node: {node_name}")
                    if isinstance(node_data, dict):
                        if "messages" in node_data:
                            msgs = node_data["messages"]
                            if msgs and len(msgs) > 0:
                                last_msg = msgs[-1]
                                print(f"    Message type: {type(last_msg).__name__}")
                                if hasattr(last_msg, "content"):
                                    content = last_msg.content[:100] if len(str(last_msg.content)) > 100 else last_msg.content
                                    print(f"    Content: {content}")
                                if hasattr(last_msg, "tool_calls"):
                                    print(f"    Tool calls: {last_msg.tool_calls}")

        elif chunk.event == "values":
            if isinstance(chunk.data, dict) and "messages" in chunk.data:
                msgs = chunk.data["messages"]
                print(f"  Total messages in state: {len(msgs)}")

        elif chunk.event == "messages":
            print(f"  Message event data: {chunk.data}")

if __name__ == "__main__":
    asyncio.run(test_streaming_events())
