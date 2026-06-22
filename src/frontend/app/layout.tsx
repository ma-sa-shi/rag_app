import '@/globals.css';
import { cookies } from 'next/headers';
import SignOutButton from '@/components/features/auth/SignoutButton';
export const metadata = {
  title: '業務効率化アプリ',
  description: 'ビジネスの生産性を向上させるツール',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isSignedIn = cookieStore.has('session_token');
  return (
    <html lang="ja">
      {/* min-h-screenは最小の高さを100vh, antialiasedはwindowsでは効きづらい */}
      <body className="flex flex-col min-h-screen bg-slate-100 text-slate-500 antialiased">
        {/* スクロールしても常に上に張り付ける */}
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between px-6 max-w-7xl mx-auto">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              業務効率化アプリ
            </h1>
            <nav>{isSignedIn && <SignOutButton />}</nav>
          </div>
        </header>
        <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 flex flex-col items-center justify-center">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="flex h-14 items-center justify-center px-6 max-w-7xl mx-auto">
            <p className="text-sm text-slate-400">
              &copy; 2026 業務効率化アプリ. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
