import { NextResponse } from 'next/server';
import { StatusCodes } from 'http-status-codes';

import { ChatStreamRequest } from '@/types/rag';
import { getUserIdFromToken } from '@/lib/auth';
import { getFastApiUrl } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * フロントエンドからの質問をFastAPIのRAG Streaming APIへプロキシするAPI Route
 */
export async function POST(request: Request) {
  const requestId = request.headers.get('X-Request-ID') || crypto.randomUUID();

  const userId = await getUserIdFromToken();
  if (!userId) {
    logger.warn({ context: { requestId } }, 'Unauthorized chat stream request');
    return NextResponse.json(
      { error: '認証が必要です' },
      { status: StatusCodes.UNAUTHORIZED }
    );
  }

  const { question }: ChatStreamRequest = await request.json();

  try {
    const response = await fetch(`${getFastApiUrl()}/chats/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': String(userId),
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok || !response.body) {
      logger.error(
        { context: { requestId, userId, httpStatus: response.status } },
        'FastAPI stream response was not OK'
      );
      return NextResponse.json(
        {
          error:
            '回答の生成中にエラーが発生しました。時間を置いて再度お試しください。',
        },
        { status: response.status }
      );
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    logger.error(
      { err: error, context: { requestId, userId } },
      'Stream proxy server error occurred'
    );
    return NextResponse.json(
      { error: 'サーバーで予期せぬエラーが発生しました' },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
