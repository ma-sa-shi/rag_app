import UploadForm from '../../components/UploadForm';
import { getFiles } from '../actions/file';
import FileList from '../../components/FileList';

export default async function UploadPage() {
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
