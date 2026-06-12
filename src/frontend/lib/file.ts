import { DocFile } from '@/types/file';
import { pool } from '@/lib/db';
import { logger } from '@/lib/logger';

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

    const [rows] = await pool.execute(query);
    return rows as DocFile[];
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch files from DB');
    return [];
  }
}
