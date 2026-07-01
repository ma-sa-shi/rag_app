import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DocFile } from '@/types/file';
import { getPool } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getUserIdFromToken } from '@/lib/auth';
import { getS3BucketName, getAppEnv } from '@/lib/env';
import { s3 } from '@/lib/env';
import { FileViewUrlActionResponse } from '@/types/file';

/**
 * アップロードされたファイルを取得する関数
 */
export async function getFiles(): Promise<DocFile[]> {
  try {
    const query = `
      SELECT doc_id, filename, dir_path, status, created_at
      FROM docs
      WHERE delete_flg = FALSE
      ORDER BY created_at DESC
    `;
    const pool = getPool();
    const [rows] = await pool.execute(query);
    return rows as DocFile[];
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch files from DB');
    return [];
  }
}

/**
 * 安全で一意なファイル名を生成する関数
 */
export function buildSafeUniqueFilename(originalFilename: string): string {
  return `${Date.now()}_${originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

/**
 * ファイルのURLを取得する関数。クラウド環境では署名付きURLを生成し、ローカル環境では直接パスを返す。
 */
export async function getFileViewUrl(
  docId: number,
  requestId: string = crypto.randomUUID()
): Promise<FileViewUrlActionResponse> {
  const userId = await getUserIdFromToken();
  if (!userId) return { error: '認証が必要です' };

  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `
        SELECT dir_path
        FROM docs
        WHERE doc_id = ? AND delete_flg = FALSE
        LIMIT 1
      `,
      [docId]
    );

    const doc = (rows as { dir_path: string }[])[0];
    if (!doc.dir_path) {
      return { error: '対象のファイルが見つかりません' };
    }

    if (doc.dir_path.startsWith('/uploads/')) {
      return { url: doc.dir_path };
    }

    if (getAppEnv() !== 'cloud') {
      return { error: 'ファイルの表示URL取得に失敗しました' };
    }

    const bucket = getS3BucketName();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: doc.dir_path,
      ResponseContentDisposition: 'inline',
      ResponseContentType: 'text/plain; charset=utf-8',
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 180 });
    return { url };
  } catch (error) {
    logger.error(
      { err: error, context: { requestId, userId, docId } },
      'Failed to generate file view URL'
    );
    return { error: 'ファイルの表示URL取得に失敗しました' };
  }
}
