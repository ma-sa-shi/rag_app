'use server';
import * as argon2 from 'argon2';
import * as jose from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  UserRow,
  SigninActionResponse,
  SignupActionResponse,
  JWTPayloadData,
} from '@/types/auth';
import { pool } from '@/lib/db';
import { JWT_SECRET } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * ユーザーのログイン認証を行い、成功時にJWTを発行するServerAction
 */
export async function signinAction(
  _prevState: SigninActionResponse,
  formData: FormData
): Promise<SigninActionResponse> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!username || !password) {
    return {
      success: false,
      error: 'ユーザー名とパスワードを入力してください。',
    };
  }

  try {
    const [rows] = await pool.execute<UserRow[]>(
      'SELECT user_id, username, hashed_password, is_admin FROM users WHERE username = ? AND delete_flg = FALSE LIMIT 1',
      [username]
    );

    const user = rows[0];

    if (!user) {
      return {
        success: false,
        // 弾かれる理由を特定させない
        error: 'ユーザー名またはパスワードが正しくありません。',
      };
    }

    const isPasswordValid = await argon2.verify(user.hashed_password, password);
    if (!isPasswordValid) {
      return {
        success: false,
        // 弾かれる理由を特定させない
        error: 'ユーザー名またはパスワードが正しくありません。',
      };
    }
    const payload: JWTPayloadData = {
      userId: user.user_id,
      username: user.username,
      // !!でtrueかfalseに型変換
      isAdmin: !!user.is_admin,
    };
    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(JWT_SECRET);
    const cookieStore = await cookies();
    cookieStore.set('session_token', token, {
      // DOM操作(document.cookie)により読み取られないようにするため
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      // 他サイトからのリクエストにCookieを添付しない
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 2,
    });
  } catch (error) {
    logger.error(
      { err: error, context: { username } },
      'Signin process failed'
    );
    return {
      success: false,
      error: 'システムエラーが発生しました。時間をおいて再度お試しください。',
    };
  }
  // redirectはErrorをthrowするのでtry-catchの外に
  redirect('/');
}

/**
 * ユーザーの新規登録を行うServerAction
 */
export async function signupAction(
  _prevState: SignupActionResponse,
  formData: FormData
): Promise<SignupActionResponse> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!username || !password) {
    return { success: false, error: 'すべての項目を入力してください。' };
  }

  try {
    const [existingUsers] = await pool.execute<UserRow[]>(
      'SELECT user_id FROM users WHERE username = ? AND delete_flg = FALSE LIMIT 1',
      [username]
    );
    if (existingUsers.length > 0) {
      return {
        success: false,
        error: 'このユーザー名は既に使用されています。',
      };
    }
    const hashedPassword = await argon2.hash(password);
    await pool.execute(
      'INSERT INTO users (username, hashed_password) VALUES (?, ?)',
      [username, hashedPassword]
    );
    return { success: true, error: null };
  } catch (error) {
    logger.error({ err: error, context: username }, 'Signup process failed');
    return { success: false, error: '登録中にエラーが発生しました。' };
  }
}
