"""
Test the complete ReAct flow with visible thinking and tool calls
"""
import asyncio
from langgraph_sdk import get_client

async def test_react_flow():
    """Test complete ReAct flow"""

    client = get_client(url="http://127.0.0.1:2025")
    thread = await client.threads.create()
    print(f"✅ Created thread: {thread['thread_id']}\n")

    query = "K5 브레이크 문제 검색해줘"
    print(f"Query: {query}\n")
    print("=" * 80)

    stream = client.runs.stream(
        thread["thread_id"],
        "react_agent",
        input={"messages": [{"role": "user", "content": query}]},
        stream_mode=["values", "updates"]
    )

    step_num = 0
    async for chunk in stream:
        if chunk.event == "updates":
            step_num += 1
            print(f"\n{'='*80}")
            print(f"STEP {step_num}")
            print('='*80)

            for node_name, node_data in chunk.data.items():
                print(f"\n📍 Node: {node_name}")

                if isinstance(node_data, dict) and "messages" in node_data:
                    msgs = node_data["messages"]
                    if msgs and len(msgs) > 0:
                        for msg in msgs:
                            # AIMessage인 경우
                            if hasattr(msg, "content") and msg.content:
                                print(f"\n💬 Message Content:")
                                print(msg.content)

                            # Tool calls가 있는 경우
                            if hasattr(msg, "tool_calls") and msg.tool_calls:
                                print(f"\n🔧 Tool Calls:")
                                for tc in msg.tool_calls:
                                    print(f"  - Tool: {tc.get('name', 'N/A')}")
                                    print(f"  - Args: {tc.get('args', {})}")

    print(f"\n\n{'='*80}")
    print("✅ Test Complete")
    print('='*80)

if __name__ == "__main__":
    asyncio.run(test_react_flow())
