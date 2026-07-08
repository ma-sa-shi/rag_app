// SSMで渡す環境変数は関数により遅延評価必須
import { S3Client } from '@aws-sdk/client-s3';
import 'server-only';

export const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'ap-northeast-1',
});

type AppEnv = 'local' | 'cloud';

export function getAppEnv(): AppEnv {
  const env = process.env.APP_ENV;
  if (env === 'cloud') {
    return 'cloud';
  }
  return 'local';
}

export function getFastApiUrl(): string {
  const fastapiUrl = process.env.FASTAPI_URL;
  if (!fastapiUrl) {
    throw new Error('Environment variable FASTAPI_URL is not set.');
  }
  return fastapiUrl;
}

// バイナリ化して返す
export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Environment variable JWT_SECRET is not set.');
  }
  return new TextEncoder().encode(secret);
}

export function getMysqlEnvVars() {
  const { MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_PORT } =
    process.env;

  if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_PASSWORD || !MYSQL_DATABASE) {
    throw new Error('Missing required MySQL environment variables.');
  }

  return {
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    port: parseInt(MYSQL_PORT || '3306', 10),
  };
}

export function getS3BucketName(): string {
  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) {
    throw new Error('Environment variable S3_BUCKET_NAME is not set.');
  }
  return bucket;
}
