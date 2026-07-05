/**
 * DBから取得したチャット履歴の型定義
 */
export type ChatHistoryItem = {
  chat_id: number;
  request_id: string;
  user_id: number;
  username: string;
  question: string;
  final_answer: string;
  final_grade: 'useful' | 'useless' | 'hallucination' | null;
  retry_count: number | null;
  created_at: Date;
};

/**
 * フィルタリングの型定義
 */
export type FilterState = {
  question: string;
  answer: string;
  username: string;
  startDate: string;
  endDate: string;
};

/**
 * ChatHistoryのpropsの型定義
 */
export type ChatHistoryProps = {
  initialHistory: ChatHistoryItem[];
};
