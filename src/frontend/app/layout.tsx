import '@/globals.css';
import { cookies } from 'next/headers';
import Link from 'next/link';
import SignOutButton from '@/components/features/auth/SignoutButton';
import { FileText, Search, Database, MessageSquare } from 'lucide-react';

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
  const navItems = [
    { label: '社内ナレッジ AI検索・回答', href: '/', icon: Search },
    { label: 'ドキュメント管理', href: '/documents', icon: FileText },
    {
      label: 'データベース AI検索・回答',
      href: '/text-to-sql',
      icon: MessageSquare,
    },
    { label: 'データベース管理', href: '/database', icon: Database },
  ];
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

        <div className="flex flex-1 w-full">
          {isSignedIn && (
            <aside className="sticky top-16 h-[calc(100vh-4rem)] w-64 border-r border-slate-200 bg-white p-4 shrink-0">
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                      <Icon className="h-4 w-4 text-slate-500" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </aside>
          )}

          <main className="flex-1 min-w-0 px-8 py-10">
            <div>{children}</div>
          </main>
        </div>

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
