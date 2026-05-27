'use client';

import { useTransition } from 'react';
import { ingestFile, type DocFile } from '../app/actions/file';

export default function FileList({ files }: { files: DocFile[] }) {
  // 重い処理を実行中にもUIを応答させるuseTransitionを使用
  const [isPending, startTransition] = useTransition();

  const handleIngest = (docId: number) => {
    if (isPending) return;

    startTransition(async () => {
      const result = await ingestFile(docId);
      if (result?.error) {
        alert(result.error);
      }
    });
  };

  return (
    <div>
      <h3>アップロード済みファイル一覧</h3>
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
