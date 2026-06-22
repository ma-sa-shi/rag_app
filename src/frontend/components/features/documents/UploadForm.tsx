'use client';
import { useActionState } from 'react';
import { uploadFile } from '@/app/actions/file-actions';

export default function UploadForm() {
  const [state, formAction, isPending] = useActionState(uploadFile, null);
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">新規ファイル追加</h3>
      <form action={formAction}>
        <div className="flex-1">
          <input
            type="file"
            name="file"
            required
            disabled={isPending}
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-lg bg-slate-50/50 p-1.5 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap min-w-30"
        >
          {isPending ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              送信中
            </>
          ) : (
            '送信'
          )}
        </button>
      </form>
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
          {state.message}
        </p>
      )}
    </div>
  );
}
