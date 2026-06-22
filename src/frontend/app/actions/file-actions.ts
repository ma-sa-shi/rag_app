'use server';

import { writeFile, mkdir } from 'fs/promises';
import { revalidatePath } from 'next/cache';
import { join } from 'path';

import { UploadActionResponse, IngestActionResponse } from '@/types/file';
import { getUserIdFromToken } from '@/lib/auth';
import { pool } from '@/lib/db';
import { FASTAPI_URL } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * ユーザーがアップロードしたファイルをサーバに保存し、DBにメタデータを登録するServerAction
 */
export async function uploadFile(
  _prevState: UploadActionResponse | null,
  formData: FormData
): Promise<UploadActionResponse> {
  const userId = await getUserIdFromToken();
  if (!userId) {
    logger.warn('Unauthorized file upload attempt');
    return { error: '認証が必要です' };
  }

  const file = formData.get('file') as File;
  if (!file || file.size === 0) return { error: 'ファイルがありません' };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    const filename = `${Date.now()}_${file.name}`;
    const filePath = join(uploadDir, filename);

    const extractedText = new TextDecoder().decode(buffer);
    const query = `
      INSERT INTO docs (user_id, dir_path, filename, extracted_text)
      VALUES (?, ?, ?, ?)
    `;
    const publicUrlPath = `/uploads/${filename}`;

    writeFile(filePath, buffer);
    pool.execute(query, [userId, publicUrlPath, file.name, extractedText]);

    return { success: true, message: `${file.name}を保存しました` };
  } catch (error) {
    logger.error(
      { err: error, context: { userId, filename: file.name } },
      'File upload process failed'
    );
    return { error: 'ファイルのアップロードに失敗しました' };
  }
}

/**
 * chormaに保存するリクエストをFastAPIのembedding APIに送信するServerAction
 */
export async function ingestFile(
  docId: number,
  requestId: string = crypto.randomUUID()
): Promise<IngestActionResponse> {
  const userId = await getUserIdFromToken();
  if (!userId) return { error: '認証が必要です' };

  try {
    await pool.execute(
      'UPDATE docs SET status = "processing" WHERE doc_id = ?',
      [docId]
    );
    revalidatePath('/documents');

    const response = await fetch(
      `${FASTAPI_URL}/documents/${docId}/embeddings`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(userId),
          'X-Request-ID': requestId,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: 'ファイルの取込み処理に失敗しました' }));
      revalidatePath('/documents');
      return { error: errorData.detail };
    }
    revalidatePath('/documents');
    return { success: true };
  } catch (error) {
    logger.error(
      { err: error, context: { requestId, userId, docId } },
      'Ingestion failed'
    );
    await pool.execute('UPDATE docs SET status = "failed" WHERE doc_id = ?', [
      docId,
    ]);
    revalidatePath('/documents');
  }
  return { error: 'ファイルの取込み処理に失敗しました' };
}
