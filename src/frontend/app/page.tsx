import { redirect } from 'next/navigation';

import ChatConsole from '@/components/features/rag/ChatConsole';
import ChatHistory from '@/components/features/rag/ChatHistory';
import { getUserIdFromToken } from '@/lib/auth';
import { getRecentChatList } from '@/lib/chat';

export default async function RagChatPage() {
  const userId = await getUserIdFromToken();
  if (!userId) {
    redirect('/auth');
  }

  return (
    <div className="w-full max-w-4xl space-y-8 animate-fade animate-duration-500">
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          社内ナレッジ AI検索・回答
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          アップロードされた社内ドキュメントの知識を活用し、高精度なAI検索・回答を行います。
        </p>
      </div>
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <ChatConsole />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <ChatHistory initialHistory={await getRecentChatList()} />
        </div>
      </div>
    </div>
  );
}
