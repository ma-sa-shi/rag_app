'use client';
import { useActionState, useEffect } from 'react';

import { signupAction } from '@/app/actions/auth-actions';
import { SignUpFormProps } from '@/types/auth';

export default function SignUpForm({ onSuccess }: SignUpFormProps) {
  const [state, formAction, isPending] = useActionState(signupAction, {
    success: false,
    error: null,
  });
  useEffect(() => {
    if (state.success) {
      alert('登録が完了しました。ログインしてください。');
      onSuccess();
    } else if (state.error) {
      alert(state.error);
    }
  }, [state.success, state.error, onSuccess]);
  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">新規登録</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            ユーザー名
          </label>
          <input
            type="text"
            name="username"
            placeholder="ユーザー名"
            required
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            パスワード
          </label>
          <input
            type="password"
            name="password"
            placeholder="パスワード"
            required
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            登録中
          </>
        ) : (
          '登録する'
        )}
      </button>
    </form>
  );
}
