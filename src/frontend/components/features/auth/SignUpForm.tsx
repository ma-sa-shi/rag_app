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
    <form action={formAction}>
      <h2>新規登録</h2>
      <input type="text" name="username" placeholder="ユーザー名" required />
      <input
        type="password"
        name="password"
        placeholder="パスワード"
        required
      />
      <button type="submit" disabled={isPending}>
        {isPending ? '登録中' : '登録する'}
      </button>
    </form>
  );
}
