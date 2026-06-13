'use client';
import { useTransition, useState } from 'react';

import { ingestFile } from '@/app/actions/file-actions';
import { DocFile } from '@/types/file';
import { logger } from '@/lib/logger';

/**
 * アップロード済みファイルの一覧を表示し、取込みボタンを表示するclient component
 */
export default function FileList({ files }: { files: DocFile[] }) {
  // 重い処理を実行中にもUIを応答させるuseTransitionを使用
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleIngest = (docId: number) => {
    if (isPending) return;
    setErrorMessage(null);

    startTransition(async () => {
      const requestId = crypto.randomUUID();
      try {
        const result = await ingestFile(docId, requestId);
        if (result?.error) {
          setErrorMessage(result.error);
        }
      } catch (error) {
        logger.error(
          { err: error, context: { requestId, docId } },
          'Failed to trigger file ingestion from client'
        );
        setErrorMessage(
          '取込み処理の開始に失敗しました。時間をおいて再度お試しください。'
        );
      }
    });
  };

  return (
    <div>
      <h3>アップロード済みファイル一覧</h3>
      {errorMessage && (
        <div>
          <span>{errorMessage}</span>
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th>ファイル</th>
            <th>ステータス</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr key={file.doc_id}>
              <td>
                <a
                  href={file.dir_path}
                  // _blank:ファイルを新しいタブで開く
                  target="_blank"
                  // noopener:リンク先が元のページを操作できないようにする
                  // noreferrer:リンク先にリファラー情報を送らないようにする
                  rel="noopener noreferrer"
                >
                  {file.filename}
                </a>
              </td>
              <td>
                <span>{file.status}</span>
              </td>
              <td>
                <button
                  onClick={() => handleIngest(file.doc_id)}
                  // 取込み中はボタンを非活性化、失敗時はリトライするため活性化
                  disabled={
                    isPending ||
                    file.status === 'processing' ||
                    file.status === 'ingested'
                  }
                >
                  {file.status === 'processing'
                    ? '取込み中'
                    : file.status === 'ingested'
                      ? '取込み完了'
                      : '取込み'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
