'use client';
import { useActionState, useEffect } from 'react';

import { signinAction } from '@/app/actions/auth-actions';

export default function SignInForm() {
  const [state, formAction, isPending] = useActionState(signinAction, {
    success: false,
    error: null,
  });
  useEffect(() => {
    if (state.error) {
      alert(state.error);
    }
  }, [state.error]);
  return (
    <form action={formAction}>
      <h2>ログイン</h2>
      <input type="text" name="username" placeholder="ユーザー名" required />
      <input
        type="password"
        name="password"
        placeholder="パスワード"
        required
      />
      <button type="submit" disabled={isPending}>
        {isPending ? 'ログイン中' : 'ログイン'}
      </button>
    </form>
  );
}
