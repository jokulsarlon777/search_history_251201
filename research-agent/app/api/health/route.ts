import { NextRequest, NextResponse } from "next/server";

const REACT_AGENT_URL = process.env.NEXT_PUBLIC_REACT_AGENT_URL || "http://localhost:2025";
const RESEARCH_AGENT_URL = process.env.NEXT_PUBLIC_LANGGRAPH_URL || "http://localhost:2024";
const ELASTICSEARCH_URL = process.env.NEXT_PUBLIC_ELASTICSEARCH_URL || "http://localhost:9200";

interface ServerHealth {
  name: string;
  url: string;
  status: "online" | "offline" | "error";
  responseTime?: number;
  error?: string;
  version?: string;
  clusterName?: string;
}

async function checkServer(name: string, url: string): Promise<ServerHealth> {
  const startTime = Date.now();

  try {
    // LangGraph 서버는 /ok 엔드포인트에서 health check 응답
    const response = await fetch(`${url}/ok`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5초 타임아웃
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        name,
        url,
        status: "online",
        responseTime,
      };
    } else {
      return {
        name,
        url,
        status: "error",
        responseTime,
        error: `HTTP ${response.status}`,
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      name,
      url,
      status: "offline",
      responseTime,
      error: error.message || "Connection failed",
    };
  }
}

async function checkElasticsearch(url: string): Promise<ServerHealth> {
  const startTime = Date.now();

  try {
    // Elasticsearch는 루트 엔드포인트에서 클러스터 정보 반환
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5초 타임아웃
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      return {
        name: "Elasticsearch",
        url,
        status: "online",
        responseTime,
        version: data.version?.number,
        clusterName: data.cluster_name,
      };
    } else {
      return {
        name: "Elasticsearch",
        url,
        status: "error",
        responseTime,
        error: `HTTP ${response.status}`,
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      name: "Elasticsearch",
      url,
      status: "offline",
      responseTime,
      error: error.message || "Connection failed",
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // 세 서버 동시 체크
    const [reactAgent, researchAgent, elasticsearch] = await Promise.all([
      checkServer("React Agent", REACT_AGENT_URL),
      checkServer("Deep Research Agent", RESEARCH_AGENT_URL),
      checkElasticsearch(ELASTICSEARCH_URL),
    ]);

    const allHealthy =
      reactAgent.status === "online" &&
      researchAgent.status === "online" &&
      elasticsearch.status === "online";

    return NextResponse.json({
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      servers: {
        reactAgent,
        researchAgent,
        elasticsearch,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 500 }
    );
  }
}
