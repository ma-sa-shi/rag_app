'use client';
import { useActionState } from 'react';
import { uploadFile } from '@/app/actions/file-actions';

export default function UploadForm() {
  const [state, formAction, isPending] = useActionState(uploadFile, null);
  return (
    <div>
      <form action={formAction}>
        <input type="file" name="file" required disabled={isPending} />
        <button type="submit" disabled={isPending}>
          {isPending ? 'アップロード中' : '送信'}
        </button>
      </form>
      {state?.error && <p>{state.error}</p>}
      {state?.success && <p>{state.message}</p>}
    </div>
  );
}
