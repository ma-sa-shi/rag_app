'use client';
import { useState, SubmitEvent } from 'react';
import { NodeOutput, DocumentData } from './_types/rag';

export default function RagChatPage() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [queries, setQueries] = useState<string[]>([]);
  const [contexts, setContexts] = useState<DocumentData[]>([]);
  const [answer, setAnswer] = useState<string>('');
  const [gradeInfo, setGradeInfo] = useState<{
    grade: string;
    feedback: string;
  } | null>(null);
  const [failureAnalysis, setFailureAnalysis] = useState<string>('');

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    // 前回の状態をリセット
    setLoading(true);
    setCurrentStatus('ワークフローを開始しました');
    setQueries([]);
    setContexts([]);
    setAnswer('');
    setGradeInfo(null);
    setFailureAnalysis('');

    try {
      const response = await fetch('http://localhost:8000/api/chats/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!response.body) throw new Error('ReadableStreamが利用できません。');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
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
            console.error('JSONパースエラー:', error);
          }
        }
      }
      setCurrentStatus((prev) =>
        prev !== '十分な回答を作成できませんでした。'
          ? '処理が完了しました'
          : prev
      );
    } catch (error) {
      console.error('ストリーム接続エラー:', error);
      setCurrentStatus('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div>
      <form onSubmit={handleSubmit}>
        <h2>質問</h2>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? '処理中' : '送信'}
        </button>
      </form>
      {currentStatus && (
        <div>
          <span>ステータス: {currentStatus}</span>
        </div>
      )}
      {queries.length > 0 && (
        <div>
          <h3>クエリ</h3>
          <ul>
            {queries.map((query, index) => (
              <li key={index}>{query}</li>
            ))}
          </ul>
        </div>
      )}

      {answer && (
        <div>
          <div>
            <h3>回答</h3>
            {answer}
          </div>

          <div>
            <h3>コンテキスト</h3>
            {contexts.map((context, index) => (
              <div key={index}>
                <span>
                  【ファイル名】: {context.metadata.filename || '不明'}
                </span>
                <p>{context.page_content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        {gradeInfo && (
          <div>
            <h3>判定結果</h3>
            {gradeInfo.grade === 'useful'
              ? '判定: Useful'
              : '判定: Useless / Hallucination'}
            <p>フィードバック: {gradeInfo.feedback}</p>
          </div>
        )}
      </div>

      <div>
        {failureAnalysis && (
          <div>
            <h3>失敗分析</h3>
            <p>{failureAnalysis}</p>
          </div>
        )}
      </div>
    </div>
  );
}
