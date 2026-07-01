import * as jose from 'jose';
import { cookies } from 'next/headers';

import { getJwtSecret } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * JWTからuserIdを取得する関数
 */
export async function getUserIdFromToken(): Promise<number | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return null;

    const { payload } = await jose.jwtVerify(token, getJwtSecret());
    return payload.userId as number;
  } catch (error) {
    logger.error({ err: error }, 'JWT verification failed');
    return null;
  }
}
