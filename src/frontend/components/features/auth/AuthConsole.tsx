'use client';
import { useState } from 'react';

import SignInForm from '@/components/features/auth/SignInForm';
import SignUpForm from '@/components/features/auth/SignUpForm';
import { AuthMode } from '@/types/auth';

export default function AuthConsole() {
  const [mode, setMode] = useState<AuthMode>('signin');
  return (
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
      <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
        <button
          onClick={() => setMode('signin')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
            mode === 'signin'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          ログイン
        </button>
        <button
          onClick={() => setMode('signup')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
            mode === 'signup'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          新規登録
        </button>
      </div>

      {mode === 'signin' ? (
        <SignInForm />
      ) : (
        <SignUpForm onSuccess={() => setMode('signin')} />
      )}
    </div>
  );
}
