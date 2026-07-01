/**
 * docsテーブルおよびUIで扱うファイル情報
 */
export type DocFile = {
  doc_id: number;
  filename: string;
  dir_path: string;
  status: 'uploaded' | 'processing' | 'ingested' | 'failed';
  created_at: Date;
};

/**
 * ファイルアップロード処理 (uploadFile) のレスポンス
 */
export type UploadActionResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

/**
 * ファイル取込み処理 (ingestFile) のレスポンス
 */
export type IngestActionResponse = {
  success?: boolean;
  error?: string;
};

/**
 * ファイル閲覧URL取得処理 (getFileViewUrl) のレスポンス
 */
export type FileViewUrlActionResponse = {
  url?: string;
  error?: string;
};
