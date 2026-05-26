'use server';

import { pool } from '../../lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getUserIdFromToken } from './auth';
import { revalidatePath } from 'next/cache';

const FASTAPI_URL = process.env.FASTAPI_URL;

export type DocFile = {
  doc_id: number;
  filename: string;
  dir_path: string;
  status: 'uploaded' | 'processing' | 'ingested' | 'failed';
  created_at: Date;
};

type UploadActionResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

export async function uploadFile(
  _prevState: UploadActionResponse,
  formData: FormData
): Promise<UploadActionResponse> {
  const userId = await getUserIdFromToken();

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

    await Promise.all([
      writeFile(filePath, buffer),
      pool.execute(query, [userId, publicUrlPath, file.name, extractedText]),
    ]);
    return { success: true, message: `${file.name}を保存しました` };
  } catch (error) {
    console.error('File upload failed:', error);
    return { error: 'アップロードに失敗しました' };
  }
}

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
    console.error('Failed to fetch files:', error);
    return [];
  }
}

export async function ingestFile(docId: number) {
  const userId = await getUserIdFromToken();
  if (!userId) return { error: '認証が必要です' };

  try {
    await pool.execute(
      'UPDATE docs SET status = "processing" WHERE doc_id = ?',
      [docId]
    );
    revalidatePath('/documents');

    const response = await fetch(`${FASTAPI_URL}/api/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        doc_id: docId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error);
    }

    await pool.execute('UPDATE docs SET status = "ingested" WHERE doc_id = ?', [
      docId,
    ]);
    revalidatePath('/documents');
    return { success: true };
  } catch (error) {
    console.error('Ingestion failed:', error);
    await pool.execute('UPDATE docs SET status = "failed" WHERE doc_id = ?', [
      docId,
    ]);
    revalidatePath('/documents');
    return { error: '取込み処理に失敗しました' };
  }
}
