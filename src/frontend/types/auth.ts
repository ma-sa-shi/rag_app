import { RowDataPacket } from 'mysql2';

/**
 * ユーザ登録後にモードを切り替える関数の型
 */

export type SignUpFormProps = {
  onSuccess: () => void;
};

/**
 * usersテーブルから取得するレコードのデータ構造
 */
export type UserRow = RowDataPacket & {
  user_id: number;
  username: string;
  hashed_password: string;
  is_admin: boolean;
  delete_flg: boolean;
};

/**
 * ログイン・新規登録画面の表示モード切替
 */
export type AuthMode = 'signin' | 'signup';

/**
 * ログイン処理 (signinAction) のレスポンス
 */
export type SigninActionResponse = {
  success: boolean;
  error: string | null;
};

/**
 * 新規登録処理 (signupAction) のレスポンス
 */
export type SignupActionResponse = {
  success: boolean;
  error: string | null;
};

/**
 * JWTのペイロードに含まれるユーザー情報
 */
export type JWTPayloadData = {
  userId: number;
  username: string;
  isAdmin: boolean;
};
