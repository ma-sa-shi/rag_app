'use client';

import { useState, useActionState, useEffect } from 'react';
import { signinAction, signupAction } from '../actions/auth';
import { AuthMode } from '../../types/auth';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [signinState, signinFormAction, isSigninPending] = useActionState(
    signinAction,
    { error: null }
  );
  const [signupState, signupFormAction, isSignupPending] = useActionState(
    signupAction,
    { success: false, error: null }
  );
  useEffect(() => {
    if (signinState.error) {
      alert(signinState.error);
    }
  }, [signinState.error]);

  useEffect(() => {
    if (signupState.success) {
      alert('登録が完了しました。ログインしてください。');
    } else if (signupState.error) {
      alert(signupState.error);
    }
  }, [signupState.success, signupState.error]);

  const handleModeChange = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
  };

  const isSigninMode = mode === 'signin' || signupState.success;

  return (
    <div>
      <div>
        <button onClick={() => handleModeChange('signin')}>ログイン</button>
        <button onClick={() => handleModeChange('signup')}>新規登録</button>
      </div>
      {isSigninMode ? (
        <form action={signinFormAction}>
          <h2>ログイン</h2>
          <input
            type="text"
            name="username"
            placeholder="ユーザー名"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="パスワード"
            required
          />
          <button type="submit" disabled={isSigninPending}>
            {isSigninPending ? 'ログイン中' : 'ログイン'}
          </button>
        </form>
      ) : (
        <form action={signupFormAction}>
          <h2>新規登録</h2>
          <input
            type="text"
            name="username"
            placeholder="ユーザー名"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="パスワード"
            required
          />
          <button type="submit" disabled={isSignupPending}>
            {isSignupPending ? '登録中' : '登録する'}
          </button>
        </form>
      )}
    </div>
  );
}
