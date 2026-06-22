'use client';

import { useState, useMemo, ChangeEvent } from 'react';
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

  const filterInputStyle =
    'w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700">過去の質問履歴</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          条件を指定して過去のチャットを絞り込み検索できます。
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">
            質問キーワード
          </label>
          <input
            type="text"
            placeholder="質問文から検索"
            value={filters.question}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleFilterChange('question', e.target.value)
            }
            className={filterInputStyle}
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">
            回答キーワード
          </label>
          <input
            type="text"
            placeholder="回答文から検索"
            value={filters.answer}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleFilterChange('answer', e.target.value)
            }
            className={filterInputStyle}
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">
            ユーザー名
          </label>
          <input
            type="text"
            placeholder="ユーザー名"
            value={filters.username}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleFilterChange('username', e.target.value)
            }
            className={filterInputStyle}
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">
            開始日
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleFilterChange('startDate', e.target.value)
            }
            className={filterInputStyle}
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">
            終了日
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleFilterChange('endDate', e.target.value)
            }
            className={filterInputStyle}
          />
        </div>
      </div>
      <div className="overflow-x-auto border border-slate-100 rounded-xl">
        {filteredList.length === 0 ? (
          <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <p className="text-sm text-slate-400">
              条件に一致するレコードはありません
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm text-slate-600 border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-700 font-medium text-xs">
                <th className="py-3 px-4 font-semibold">質問</th>
                <th className="py-3 px-4 font-semibold">回答</th>
                <th className="py-3 px-4 font-semibold">ユーザー</th>
                <th className="py-3 px-4 font-semibold text-right">日付</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredList.map((item) => (
                <tr
                  key={item.chat_id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="py-3.5 px-4 font-medium text-blue-600 max-w-45 truncate">
                    <Link
                      href={`/chat/${item.request_id}`}
                      className="hover:text-blue-700 hover:underline"
                    >
                      {item.question.length > 20
                        ? item.question.slice(0, 20)
                        : item.question}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 max-w-60 truncate">
                    {item.final_answer.length > 25
                      ? item.final_answer.slice(0, 25)
                      : item.final_answer}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    {item.username}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-right whitespace-nowrap">
                    {item.created_at.toLocaleString('ja-JP', {
                      timeZone: 'Asia/Tokyo',
                      // 環境依存を無くし、秒数を非表示にするため
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
