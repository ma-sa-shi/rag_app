import { redirect } from 'next/navigation';

import ChatConsole from '@/components/features/rag/ChatConsole';
import { getUserIdFromToken } from '@/lib/auth';

export default async function RagChatPage() {
  const userId = await getUserIdFromToken();
  if (!userId) {
    redirect('/auth');
  }
  return (
    <main>
      <h2>RAG チャットシステム</h2>
      <ChatConsole />
    </main>
  );
}
