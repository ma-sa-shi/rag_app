'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChatHistoryProps, FilterState } from '@/types/chatHistory';
import { filterChatHistory } from '@/lib/chatFilter';

export default function ChatHistory({ initialHistory }: ChatHistoryProps) {
  const [filters, setFilters] = useState<FilterState>({
    question: '',
    answer: '',
    username: '',
    startDate: '',
    endDate: '',
  });
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // useMemoにより入力内容が変わったときだけ自動的に再フィルタを実行
  const filteredList = useMemo(() => {
    return filterChatHistory(initialHistory, filters);
  }, [initialHistory, filters]);

  return (
    <div>
      <div>
        <div>
          <input
            type="text"
            value={filters.question}
            onChange={(e) => handleFilterChange('question', e.target.value)}
          />
          <input
            type="text"
            value={filters.answer}
            onChange={(e) => handleFilterChange('answer', e.target.value)}
          />
          <input
            type="text"
            value={filters.username}
            onChange={(e) => handleFilterChange('username', e.target.value)}
          />
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
        </div>
        <div>
          {filteredList.length === 0 ? (
            <div>条件に一致するレコードはありません</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>質問</th>
                  <th>回答</th>
                  <th>ユーザー</th>
                  <th>日付</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item) => (
                  <tr key={item.chat_id}>
                    <td>
                      <Link href={`/chat/${item.request_id}`}>
                        {item.question.length > 20
                          ? item.question.slice(0, 20)
                          : item.question}
                      </Link>
                    </td>
                    <td>
                      {item.final_answer.length > 20
                        ? item.final_answer.slice(0, 20)
                        : item.final_answer}
                    </td>
                    <td>{item.username}</td>
                    <td>
                      {item.created_at.toLocaleString('ja-JP', {
                        timeZone: 'Asia/Tokyo',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
