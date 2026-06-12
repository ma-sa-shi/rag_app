'use client';
import { useState } from 'react';

import SignInForm from '@/components/features/auth/SignInForm';
import SignUpForm from '@/components/features/auth/SignUpForm';
import { AuthMode } from '@/types/auth';

export default function AuthConsole() {
  const [mode, setMode] = useState<AuthMode>('signin');
  return (
    <div>
      <div>
        <button onClick={() => setMode('signin')}>ログイン</button>
        <button onClick={() => setMode('signup')}>新規登録</button>
      </div>

      {mode === 'signin' ? (
        <SignInForm />
      ) : (
        <SignUpForm onSuccess={() => setMode('signin')} />
      )}
    </div>
  );
}
