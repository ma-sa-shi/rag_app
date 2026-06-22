'use client';
import { useState, SubmitEvent } from 'react';
import { NodeOutput, DocumentData, GradeInfo } from '@/types/rag';
import { logger } from '@/lib/logger';

/**
 * SSEストリーム通信を行い、nodesの出力をリアルタイムに表示するコンポーネント
 */
export default function ChatConsole() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [queries, setQueries] = useState<string[]>([]);
  const [contexts, setContexts] = useState<DocumentData[]>([]);
  const [answer, setAnswer] = useState<string>('');
  const [gradeInfo, setGradeInfo] = useState<GradeInfo | null>(null);
  const [failureAnalysis, setFailureAnalysis] = useState<string>('');

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    // 連打による重複リクエストと空文字送信の防止
    if (!question.trim() || loading) return;

    // 前回の状態をリセット
    setLoading(true);
    setCurrentStatus('ワークフローを開始しました');
    setQueries([]);
    setContexts([]);
    setAnswer('');
    setGradeInfo(null);
    setFailureAnalysis('');
    const requestId = crypto.randomUUID();
    try {
      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify({ question }),
      });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: 'Unknown error' }));
        logger.error(
          { err: errorData, context: { requestId } },
          `FastAPI returned status ${response.status}`
        );
        throw new Error(`FastAPI Stream Error`);
      }
      if (!response.body) throw new Error('ReadableStream is not available.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        // splitしたデータの最後は不完全なデータのためbufferに戻し次の受信データと結合しJSON.parseエラーを回避
        buffer = parts.pop() || '';

        for (const part of parts) {
          const line = part.trim();
          if (!line || !line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6);
          try {
            const nodeData: NodeOutput = JSON.parse(jsonStr);
            if (
              'generate_queries_node' in nodeData &&
              nodeData.generate_queries_node
            ) {
              const data = nodeData.generate_queries_node;
              setCurrentStatus(
                data.retry_count && data.retry_count > 1
                  ? `再試行中 (回数: ${data.retry_count - 1})`
                  : '検索クエリを生成中'
              );
              if (data.queries && data.queries.length > 0) {
                // 最新のQueriesを表示する
                setQueries(data.queries[data.queries.length - 1]);
              }
            } else if (
              'retrieve_contexts_node' in nodeData &&
              nodeData.retrieve_contexts_node
            ) {
              setCurrentStatus(
                'ベクトルストアからコンテキストを取得しました。'
              );
              const data = nodeData.retrieve_contexts_node;
              if (data.documents && data.documents.length > 0) {
                setContexts(data.documents[data.documents.length - 1]);
              }
            } else if (
              'generate_answer_node' in nodeData &&
              nodeData.generate_answer_node
            ) {
              setCurrentStatus('回答を生成しました。');
              const data = nodeData.generate_answer_node;
              if (data.answer && data.answer.length > 0) {
                setAnswer(data.answer[data.answer.length - 1]);
              }
            } else if (
              'grade_answer_node' in nodeData &&
              nodeData.grade_answer_node
            ) {
              setCurrentStatus('回答の評価が完了しました。');
              const data = nodeData.grade_answer_node;
              if (data.grade && data.grade.length > 0) {
                setGradeInfo({
                  grade: data.grade[data.grade.length - 1],
                  feedback: data.feedback[data.feedback.length - 1],
                });
              }
            } else if (
              'analyze_failure_node' in nodeData &&
              nodeData.analyze_failure_node
            ) {
              setCurrentStatus('十分な回答を作成できませんでした。');
              const data = nodeData.analyze_failure_node;
              setFailureAnalysis(data.failure_analysis);
            }
          } catch (error) {
            // client側ではpinoは軽量化するのでErrorオブジェクトの解析が必要
            logger.error(
              {
                err:
                  error instanceof Error
                    ? { message: error.message, name: error.name }
                    : String(error),
                context: { requestId },
              },
              'Failed to parse SSE JSON payload'
            );
          }
        }
      }
      setCurrentStatus((prev) =>
        prev !== '十分な回答を作成できませんでした。'
          ? '処理が完了しました'
          : prev
      );
    } catch (error) {
      // client側のpinoロガーは軽量化されるため、Errorオブジェクトの解析が必要
      logger.error(
        {
          err:
            error instanceof Error
              ? { message: error.message, name: error.name }
              : String(error),
          context: { requestId },
        },
        'Stream connection or processing failed'
      );
      setCurrentStatus('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-slate-700">AIへの質問入力</h3>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
          disabled={loading}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm disabled:opacity-50 disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap min-w-30"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              処理中
            </>
          ) : (
            '送信'
          )}
        </button>
      </form>
      {currentStatus && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200/60 text-sm text-blue-700 font-medium animate-pulse">
          <span className="w-2 h-2 bg-blue-600 rounded-full" />
          <span>ステータス: {currentStatus}</span>
        </div>
      )}
      {queries.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            検索クエリ
          </h4>
          <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
            {queries.map((query, index) => (
              <li key={index} className="marker:text-slate-400">
                {query}
              </li>
            ))}
          </ul>
        </div>
      )}

      {answer && (
        <div className="space-y-5 pt-2">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
            <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">
              AIの回答
            </h4>
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {answer}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              参照コンテキスト
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {contexts.map((context, index) => (
                <div
                  key={index}
                  className="border border-slate-200 bg-white rounded-xl p-4 text-sm space-y-2 shadow-sm"
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 w-fit px-2.5 py-1 rounded-md">
                    <span>
                      📄 【ファイル名】: {context.metadata.filename || '不明'}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-xs bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    {context.page_content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {gradeInfo && (
        <div
          className={`border rounded-xl p-4 space-y-2 ${
            gradeInfo.grade === 'useful'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            <span
              className={`w-2.5 h-2.5 rounded-full ${gradeInfo.grade === 'useful' ? 'bg-emerald-500' : 'bg-rose-500'}`}
            />
            <span>
              {gradeInfo.grade === 'useful'
                ? '判定結果: Useful (有用)'
                : '判定結果: Useless / Hallucination (再試行対象)'}
            </span>
          </div>
          <p className="text-xs leading-relaxed opacity-90">
            フィードバック: {gradeInfo.feedback}
          </p>
        </div>
      )}

      {failureAnalysis && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 space-y-1">
          <h4 className="text-sm font-bold flex items-center gap-1.5">
            失敗分析
          </h4>
          <p className="text-xs leading-relaxed opacity-90">
            {failureAnalysis}
          </p>
        </div>
      )}
    </div>
  );
}
