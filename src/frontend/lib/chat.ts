import { ChatHistoryItem } from '@/types/chatHistory';
import { pool } from '@/lib/db';

export async function getRecentChatList(): Promise<ChatHistoryItem[]> {
  try {
    const query = `
      SELECT
        ch.chat_id, ch.request_id, ch.user_id, ch.question, ch.final_answer, ch.final_grade, ch.retry_count, ch.created_at,
        u.username
      FROM chat_histories ch
      LEFT JOIN users u
      ON ch.user_id = u.user_id
      WHERE ch.delete_flg = FALSE
      ORDER BY ch.created_at DESC
      LIMIT 100;
    `;

    const [rows] = await pool.execute(query);

    return rows as ChatHistoryItem[];
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    // エラー時は空配列を返しクラッシュ回避
    return [];
  }
}
