import { NextResponse } from 'next/server';
import { getUserIdFromToken } from '@/app/actions/auth';
import { StatusCodes } from 'http-status-codes';

const FASTAPI_URL = process.env.FASTAPI_URL;

export async function POST(request: Request) {
  const requestId = request.headers.get('X-Request-ID') || crypto.randomUUID();

  const userId = await getUserIdFromToken();
  if (!userId) {
    return NextResponse.json(
      { error: '認証が必要です' },
      { status: StatusCodes.UNAUTHORIZED }
    );
  }

  const { question } = await request.json();

  try {
    const response = await fetch(`${FASTAPI_URL}/chats/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': String(userId),
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok || !response.body) {
      return NextResponse.json(
        { error: 'FastAPI側でエラーが発生しました' },
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
    console.error(`[${requestId}] Stream proxy error:`, error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
