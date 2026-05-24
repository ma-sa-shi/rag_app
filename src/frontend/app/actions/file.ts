'use server';

import { pool } from '../../lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getUserIdFromToken } from './auth';

export type DocFile = {
  doc_id: number;
  filename: string;
  dir_path: string;
  status: 'uploaded' | 'processing' | 'ingested' | 'failed';
  created_at: Date;
};

export async function uploadFile(_prevState: any, formData: FormData) {
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
