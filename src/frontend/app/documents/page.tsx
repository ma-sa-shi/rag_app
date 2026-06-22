import { redirect } from 'next/navigation';

import UploadForm from '@/components/features/documents/UploadForm';
import FileList from '@/components/features/documents/FileList';
import { getFiles } from '@/lib/file';
import { getUserIdFromToken } from '@/lib/auth';

export default async function UploadPage() {
  const userId = await getUserIdFromToken();
  if (!userId) {
    redirect('/auth');
  }
  const files = await getFiles();
  return (
    <div className="w-full max-w-4xl space-y-8 animate-fade-in">
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          ファイル管理
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          ファイルのアップロードとシステムへの取込みを行います。
        </p>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <UploadForm />
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        {files.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
            <p className="text-sm text-slate-400">
              アップロードされたファイルはありません。
            </p>
          </div>
        ) : (
          <FileList files={files} />
        )}
      </div>
    </div>
  );
}
