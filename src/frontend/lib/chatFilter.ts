import { ChatHistoryItem, FilterState } from '@/types/chatHistory';

export function filterChatHistory(
  records: ChatHistoryItem[],
  filters: FilterState
): ChatHistoryItem[] {
  return records.filter((item) => {
    // 質問文フィルタ
    if (
      filters.question &&
      !item.question.toLowerCase().includes(filters.question.toLowerCase())
    ) {
      return false;
    }

    // 回答文フィルタ
    const finalAnswer = item.final_answer || '';
    if (
      filters.answer &&
      !finalAnswer.toLowerCase().includes(filters.answer.toLowerCase())
    ) {
      return false;
    }

    // ユーザー名フィルタ
    if (
      filters.username &&
      !item.username.toLowerCase().includes(filters.username.toLowerCase())
    ) {
      return false;
    }

    // 日時範囲フィルタ
    const year = item.created_at.getFullYear();
    // getMonthは0始まりのため1を足して、0埋めして2桁にする
    const month = String(item.created_at.getMonth() + 1).padStart(2, '0');
    const day = String(item.created_at.getDate()).padStart(2, '0');
    const itemDateStr = `${year}-${month}-${day}`;
    if (filters.startDate && itemDateStr < filters.startDate) {
      return false;
    }
    if (filters.endDate && itemDateStr > filters.endDate) {
      return false;
    }
    return true;
  });
}
