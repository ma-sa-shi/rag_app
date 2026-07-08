import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { revalidatePath } from 'next/cache';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import {
  DocFile,
  UploadActionResponse,
  IngestActionResponse,
  FileViewUrlActionResponse,
} from '@/types/file';
import { getPool } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getUserIdFromToken } from '@/lib/auth';
import { getS3BucketName, getAppEnv, getFastApiUrl, s3 } from '@/lib/env';

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
function buildSafeUniqueFilename(originalFilename: string): string {
  return `${Date.now()}_${originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

/**
 * ユーザーがアップロードしたファイルをサーバに保存し、DBにメタデータを登録する
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
 * chormaに保存するリクエストをFastAPIのembedding APIに送信する
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
      `${getFastApiUrl()}/documents/${docId}/embeddings`,
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
