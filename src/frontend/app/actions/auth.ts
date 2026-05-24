'use server';

import { pool } from '../../lib/db';
import * as argon2 from 'argon2';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { RowDataPacket } from 'mysql2';
import { redirect } from 'next/navigation';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

type UserRow = RowDataPacket & {
  user_id: number;
  username: string;
  hashed_password: string;
  is_admin: boolean;
  delete_flg: boolean;
};

type signinActionResponse = {
  error: string | null;
};
type signupActionResponse = {
  success: boolean;
  error: string | null;
};

export async function signinAction(
  _prevState: any,
  formData: FormData
): Promise<signinActionResponse> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!username || !password) {
    return {
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
        error: 'ユーザー名またはパスワードが正しくありません。',
      };
    }

    const isPasswordValid = await argon2.verify(user.hashed_password, password);
    if (!isPasswordValid) {
      return {
        error: 'ユーザー名またはパスワードが正しくありません。',
      };
    }
    const token = await new SignJWT({
      userId: user.user_id,
      username: user.username,
      isAdmin: !!user.is_admin,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(JWT_SECRET);
    const cookieStore = await cookies();
    cookieStore.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 2,
    });
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'エラーが発生しました。' };
  }
  redirect('/');
}

export async function signupAction(
  _prevState: any,
  formData: FormData
): Promise<signupActionResponse> {
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
    console.error('Register error:', error);
    return { success: false, error: 'エラーが発生しました。' };
  }
}
