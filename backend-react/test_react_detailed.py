"""
Detailed test of ReAct flow
"""
import asyncio
from langgraph_sdk import get_client
import json

async def test_react_detailed():
    """Detailed test"""

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
        stream_mode=["updates"]
    )

    step_num = 0
    async for chunk in stream:
        if chunk.event == "updates":
            step_num += 1
            print(f"\n{'='*80}")
            print(f"STEP {step_num}")
            print('='*80)

            # Print raw data structure
            print(f"Raw data type: {type(chunk.data)}")
            print(f"Raw data keys: {chunk.data.keys() if isinstance(chunk.data, dict) else 'N/A'}")

            for node_name, node_data in chunk.data.items():
                print(f"\n📍 Node: {node_name}")
                print(f"   Node data type: {type(node_data)}")

                if isinstance(node_data, dict):
                    print(f"   Node data keys: {node_data.keys()}")

                    if "messages" in node_data:
                        msgs = node_data["messages"]
                        print(f"   Messages count: {len(msgs)}")

                        for i, msg in enumerate(msgs):
                            print(f"\n   Message {i+1}:")
                            print(f"     Type: {type(msg)}")

                            # Check if it's a dict or object
                            if isinstance(msg, dict):
                                print(f"     Dict keys: {msg.keys()}")
                                if "content" in msg:
                                    content = msg["content"]
                                    print(f"     Content: {content[:200] if len(str(content)) > 200 else content}")
                                if "tool_calls" in msg:
                                    print(f"     Tool calls: {msg['tool_calls']}")
                            else:
                                # It's an object
                                if hasattr(msg, "content"):
                                    content = msg.content
                                    print(f"     Content: {content[:200] if len(str(content)) > 200 else content}")
                                if hasattr(msg, "tool_calls"):
                                    print(f"     Tool calls: {msg.tool_calls}")

    print(f"\n\n{'='*80}")
    print("✅ Test Complete")
    print('='*80)

if __name__ == "__main__":
    asyncio.run(test_react_detailed())
