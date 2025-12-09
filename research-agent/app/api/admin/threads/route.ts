/**
 * Thread Export API (Beta 분석용)
 * GET /api/admin/threads - 모든 Thread 데이터 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createLangGraphClient,
  getServerThreads,
  loadThreadMessages,
} from '@/lib/langgraph';

/**
 * GET /api/admin/threads
 * 모든 Thread 데이터를 JSON으로 반환
 *
 * Query Parameters:
 * - server: 'react' | 'research' | 'all' (default: 'all')
 * - limit: number (default: 100)
 * - format: 'json' | 'csv' (default: 'json')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const serverFilter = searchParams.get('server') || 'all';
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const format = searchParams.get('format') || 'json';

    // 서버 설정
    const REACT_AGENT_URL = process.env.NEXT_PUBLIC_REACT_AGENT_URL || 'http://127.0.0.1:2025';
    const REACT_ASSISTANT_ID = process.env.NEXT_PUBLIC_REACT_ASSISTANT_ID || 'react_agent';
    const RESEARCH_URL = process.env.NEXT_PUBLIC_LANGGRAPH_URL || 'http://127.0.0.1:2024';
    const RESEARCH_ASSISTANT_ID = process.env.NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID || 'Deep Researcher';

    const serverConfigs = [];

    if (serverFilter === 'all' || serverFilter === 'react') {
      serverConfigs.push({
        type: 'react' as const,
        url: REACT_AGENT_URL,
        assistantId: REACT_ASSISTANT_ID,
      });
    }

    if (serverFilter === 'all' || serverFilter === 'research') {
      serverConfigs.push({
        type: 'research' as const,
        url: RESEARCH_URL,
        assistantId: RESEARCH_ASSISTANT_ID,
      });
    }

    // 모든 Thread 데이터 수집
    const allThreads: any[] = [];

    for (const config of serverConfigs) {
      try {
        const client = createLangGraphClient(config.url);
        const serverThreads = await getServerThreads(client, config.assistantId);

        // 각 Thread의 메시지 로드
        for (const thread of serverThreads.slice(0, limit)) {
          try {
            const messages = await loadThreadMessages(client, thread.thread_id);

            allThreads.push({
              threadId: thread.thread_id,
              serverType: config.type,
              createdAt: thread.created_at,
              messageCount: messages.length,
              messages: messages.map((msg: any) => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp || thread.created_at,
                duration: msg.duration,
                sources: msg.sources,
              })),
            });
          } catch (error) {
            console.error(`Failed to load messages for thread ${thread.thread_id}:`, error);
          }
        }
      } catch (error) {
        console.error(`Failed to load threads from ${config.type} server:`, error);
      }
    }

    // 응답 포맷
    if (format === 'csv') {
      // CSV 형식으로 변환 (질문-답변 쌍)
      const csvRows = ['Thread ID,Server Type,Created At,Question,Answer,Duration,Sources'];

      for (const thread of allThreads) {
        const userMessages = thread.messages.filter((m: any) => m.role === 'user');
        const assistantMessages = thread.messages.filter((m: any) => m.role === 'assistant');

        for (let i = 0; i < Math.max(userMessages.length, assistantMessages.length); i++) {
          const question = userMessages[i]?.content || '';
          const answer = assistantMessages[i]?.content || '';
          const duration = assistantMessages[i]?.duration || '';
          const sources = assistantMessages[i]?.sources?.length || 0;

          csvRows.push([
            thread.threadId,
            thread.serverType,
            thread.createdAt,
            `"${question.replace(/"/g, '""')}"`,
            `"${answer.replace(/"/g, '""')}"`,
            duration,
            sources,
          ].join(','));
        }
      }

      const csvContent = csvRows.join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="threads-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // JSON 형식 (기본)
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      filter: {
        server: serverFilter,
        limit,
      },
      totalThreads: allThreads.length,
      totalMessages: allThreads.reduce((sum, t) => sum + t.messageCount, 0),
      threads: allThreads,

      // 통계
      stats: {
        byServer: {
          react: allThreads.filter(t => t.serverType === 'react').length,
          research: allThreads.filter(t => t.serverType === 'research').length,
        },
        avgMessagesPerThread: allThreads.length > 0
          ? (allThreads.reduce((sum, t) => sum + t.messageCount, 0) / allThreads.length).toFixed(2)
          : 0,
      },
    });
  } catch (error) {
    console.error('Error exporting threads:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
