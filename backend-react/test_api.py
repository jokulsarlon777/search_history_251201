"""
Test the LangGraph API endpoint
"""
import asyncio
import httpx
import uuid

async def test_langgraph_api():
    """Test the LangGraph API endpoint"""

    api_url = "http://127.0.0.1:2025"

    # Create a thread
    thread_id = str(uuid.uuid4())
    print(f"Thread ID: {thread_id}")

    # Test query
    query = "LangGraph에 대해 검색해줘"
    print(f"\n질문: {query}\n")

    async with httpx.AsyncClient(timeout=60.0) as client:
        # Stream the response
        url = f"{api_url}/threads/{thread_id}/runs/stream"

        payload = {
            "assistant_id": "react_agent",
            "input": {
                "messages": [
                    {
                        "role": "user",
                        "content": query
                    }
                ]
            },
            "stream_mode": ["values"]
        }

        print("Streaming response:")
        print("=" * 60)

        async with client.stream("POST", url, json=payload) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]  # Remove "data: " prefix
                    if data and data != "[DONE]":
                        print(data)

        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_langgraph_api())
