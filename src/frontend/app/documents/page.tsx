import UploadForm from '@/components/UploadForm';
import { getFiles } from '@/app/actions/file';
import FileList from '@/components/FileList';
import { redirect } from 'next/navigation';
import { getUserIdFromToken } from '../actions/auth';

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
