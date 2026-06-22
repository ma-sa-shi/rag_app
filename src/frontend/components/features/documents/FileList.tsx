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
          '取込み処理に失敗しました。時間をおいて再度お試しください。'
        );
      }
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">
        アップロード済みファイル一覧
      </h3>
      {errorMessage && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          <span>{errorMessage}</span>
        </div>
      )}
      <div className="overflow-x-auto border border-slate-100 rounded-lg">
        <table className="w-full text-left text-sm text-slate-600 border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-700 font-medium">
              <th className="py-3 px-4 font-semibold">ファイル</th>
              <th className="py-3 px-4 font-semibold">ステータス</th>
              <th className="py-3 px-4 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {files.map((file) => (
              <tr
                key={file.doc_id}
                className="hover:bg-slate-50/50 transition-colors"
              >
                <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs truncate">
                  <a
                    href={file.dir_path}
                    // _blank:ファイルを新しいタブで開く
                    target="_blank"
                    // noopener:リンク先が元のページを操作できないようにする
                    // noreferrer:リンク先にリファラー情報を送らないようにする
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                  >
                    {file.filename}
                  </a>
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      file.status === 'processing'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200/60 animate-pulse'
                        : file.status === 'ingested'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : file.status === 'failed'
                            ? 'bg-red-50 text-red-700 border border-red-200/60'
                            : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                    }`}
                  >
                    {file.status === 'processing' && (
                      <span className="w-1.5 h-1.5 mr-1.5 bg-amber-500 rounded-full animate-ping" />
                    )}
                    {file.status === 'processing'
                      ? '取込み中'
                      : file.status === 'ingested'
                        ? '取込み完了'
                        : file.status === 'failed'
                          ? '取込み失敗'
                          : '未処理'}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => handleIngest(file.doc_id)}
                    disabled={
                      isPending ||
                      file.status === 'processing' ||
                      file.status === 'ingested'
                    }
                    className={`inline-flex items-center justify-center text-xs font-semibold px-4 py-2 rounded-lg shadow-sm border transition-all ${
                      file.status === 'processing'
                        ? 'bg-amber-50 border-amber-200 text-amber-700 cursor-not-allowed'
                        : file.status === 'ingested'
                          ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    } disabled:opacity-70`}
                  >
                    {file.status === 'processing'
                      ? '取込み中'
                      : file.status === 'ingested'
                        ? '取込み完了'
                        : file.status === 'failed'
                          ? '再取込み'
                          : '取込み'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
