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
    <main>
      <h2>ファイルアップロード</h2>
      <UploadForm />
      {files.length === 0 ? (
        <p>アップロードされたファイルはありません。</p>
      ) : (
        <FileList files={files} />
      )}
    </main>
  );
}
