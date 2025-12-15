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

  // LangGraph 서버는 여러 health check 엔드포인트를 가질 수 있음
  const healthEndpoints = ['/ok', '/info', '/health'];

  for (const endpoint of healthEndpoints) {
    try {
      const response = await fetch(`${url}${endpoint}`, {
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
      }
    } catch (error) {
      // 다음 엔드포인트 시도
      continue;
    }
  }

  // 모든 엔드포인트 실패 시
  const responseTime = Date.now() - startTime;
  return {
    name,
    url,
    status: "offline",
    responseTime,
    error: "No valid health endpoint found",
  };
}

async function checkElasticsearch(url: string): Promise<ServerHealth> {
  const startTime = Date.now();

  try {
    // Elasticsearch 루트 엔드포인트로 간단히 체크
    const response = await fetch(`${url}`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5초 타임아웃
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      // Content-Type 확인 - JSON이 아니면 잘못된 서버
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {
          name: "Elasticsearch",
          url,
          status: "error",
          responseTime,
          error: "Not an Elasticsearch server (HTML response)",
        };
      }

      const data = await response.json();

      // Elasticsearch는 루트에서 name, version 등을 반환
      if (data.name && data.version) {
        return {
          name: "Elasticsearch",
          url,
          status: "online",
          responseTime,
          clusterName: data.cluster_name || data.name,
          version: data.version?.number,
        };
      } else {
        return {
          name: "Elasticsearch",
          url,
          status: "error",
          responseTime,
          error: "Invalid Elasticsearch response",
        };
      }
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
    // Elasticsearch는 선택적 - URL이 유효한 경우에만 체크
    const shouldCheckElasticsearch = ELASTICSEARCH_URL &&
      !ELASTICSEARCH_URL.includes('8000') && // React/Research agent 포트가 아님
      ELASTICSEARCH_URL !== 'http://localhost:9200'; // 기본값이 아니거나 실제 존재하는 경우

    const checks = [
      checkServer("React Agent", REACT_AGENT_URL),
      checkServer("Deep Research Agent", RESEARCH_AGENT_URL),
    ];

    if (shouldCheckElasticsearch) {
      checks.push(checkElasticsearch(ELASTICSEARCH_URL));
    }

    const results = await Promise.all(checks);
    const [reactAgent, researchAgent, elasticsearch] = [
      results[0],
      results[1],
      results[2] || {
        name: "Elasticsearch",
        url: ELASTICSEARCH_URL,
        status: "offline" as const,
        error: "Not configured or disabled",
      }
    ];

    // 핵심 서버(React Agent, Research Agent)만 체크
    const coreServersHealthy =
      reactAgent.status === "online" &&
      researchAgent.status === "online";

    return NextResponse.json({
      status: coreServersHealthy ? "healthy" : "degraded",
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
