import 'server-only';

export const FASTAPI_URL = process.env.FASTAPI_URL ?? 'http://localhost:8000';

if (!process.env.JWT_SECRET) {
  throw new Error('環境変数JWT_SECRETが設定されていません。');
}
export const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export const mysqlEnvVars = {
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
};
