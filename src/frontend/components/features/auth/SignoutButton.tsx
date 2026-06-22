'use client';

import { signOut } from '@/app/actions/auth-actions';

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 bg-white px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
    >
      サインアウト
    </button>
  );
}
