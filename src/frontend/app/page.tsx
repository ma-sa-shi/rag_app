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
    <main>
      <h2>RAG チャットシステム</h2>
      <ChatConsole />
      <ChatHistory initialHistory={await getRecentChatList()} />
    </main>
  );
}
