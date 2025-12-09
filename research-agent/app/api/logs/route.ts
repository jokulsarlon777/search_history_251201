/**
 * 로그 저장 API
 * POST /api/logs - 프론트엔드에서 로그를 받아 서버 파일에 저장
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { LogEntry } from '@/lib/log-types';

// 로그 디렉토리 (환경 변수로 설정 가능)
const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

// 날짜별 로그 파일명 생성
function getLogFileName(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}.log`;
}

// 로그 디렉토리 초기화
async function ensureLogDirectory() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create log directory:', error);
  }
}

// NDJSON 형식으로 로그 저장 (Newline Delimited JSON)
async function appendLog(entry: LogEntry) {
  const logFile = path.join(LOG_DIR, getLogFileName());
  const logLine = JSON.stringify(entry) + '\n';

  try {
    await fs.appendFile(logFile, logLine, 'utf-8');
  } catch (error) {
    console.error('Failed to append log:', error);
    throw error;
  }
}

/**
 * POST /api/logs
 * 로그 저장 요청 처리
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 로그 디렉토리 확인
    await ensureLogDirectory();

    // 단일 로그 또는 배치 로그 처리
    if (Array.isArray(body.logs)) {
      // 배치 로그
      for (const entry of body.logs) {
        await appendLog(entry);
      }
      console.log(`📥 Saved ${body.logs.length} logs to ${getLogFileName()}`);
    } else {
      // 단일 로그
      await appendLog(body);
      console.log(`📥 Saved 1 log to ${getLogFileName()}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Logs saved successfully',
    });
  } catch (error) {
    console.error('Error saving logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/logs?date=2025-12-08
 * 로그 조회 (관리자용)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');

    let logFile: string;
    if (date) {
      // 특정 날짜의 로그
      logFile = path.join(LOG_DIR, `${date}.log`);
    } else {
      // 오늘 로그
      logFile = path.join(LOG_DIR, getLogFileName());
    }

    // 파일 읽기
    try {
      const content = await fs.readFile(logFile, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line);
      const logs = lines.map(line => JSON.parse(line));

      return NextResponse.json({
        success: true,
        date: date || getLogFileName().replace('.log', ''),
        count: logs.length,
        logs,
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return NextResponse.json({
          success: true,
          message: 'No logs found for this date',
          logs: [],
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error reading logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/logs?date=2025-12-08
 * 로그 삭제 (관리자용)
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    const logFile = path.join(LOG_DIR, `${date}.log`);

    try {
      await fs.unlink(logFile);
      return NextResponse.json({
        success: true,
        message: `Logs for ${date} deleted successfully`,
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return NextResponse.json(
          { success: false, error: 'Log file not found' },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error deleting logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
