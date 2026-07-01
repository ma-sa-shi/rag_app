'use server';

import { writeFile, mkdir } from 'fs/promises';
import { revalidatePath } from 'next/cache';
import { join } from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { buildSafeUniqueFilename } from '@/lib/file';
import { UploadActionResponse, IngestActionResponse } from '@/types/file';
import { getUserIdFromToken } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { FASTAPI_URL, getAppEnv, getS3BucketName, s3 } from '@/lib/env';
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
    const extractedText = new TextDecoder().decode(buffer);
    const storedFilename = buildSafeUniqueFilename(file.name);
    const query = `
      INSERT INTO docs (user_id, dir_path, filename, extracted_text)
      VALUES (?, ?, ?, ?)
    `;
    if (getAppEnv() === 'local') {
      const uploadDir = join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadDir, { recursive: true });
      const filePath = join(uploadDir, storedFilename);
      const publicUrlPath = `/uploads/${storedFilename}`;
      await writeFile(filePath, buffer);

      const pool = getPool();
      await pool.execute(query, [
        userId,
        publicUrlPath,
        file.name,
        extractedText,
      ]);
    } else {
      const bucket = getS3BucketName();
      const s3Key = `uploads/${storedFilename}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: s3Key,
          Body: buffer,
          ContentType: `${file.type};  charset=utf-8;`,
        })
      );
      const pool = getPool();
      await pool.execute(query, [userId, s3Key, file.name, extractedText]);
    }
    revalidatePath('/documents');
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
    const pool = getPool();
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
    const pool = getPool();
    await pool.execute('UPDATE docs SET status = "failed" WHERE doc_id = ?', [
      docId,
    ]);
    revalidatePath('/documents');
    return { error: 'ファイルの取込み処理に失敗しました' };
  }
}
