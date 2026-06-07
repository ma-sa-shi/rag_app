/**
 * ベクトルストアから取得するドキュメントのメタデータ
 */
export type DocumentMetadata = {
  doc_id: string | number;
  relevance_score: number;
  filename: string;
};

/**
 * RAGのコンテキストとして扱うドキュメントデータ
 */
export type DocumentData = {
  id: string;
  page_content: string;
  metadata: DocumentMetadata;
  type: string;
};

/**
 * ワークフローの各ノードが返却する全体レスポンス
 */
export type NodeOutputBase = {
  generate_queries_node: { queries: string[][]; retry_count: number };
  retrieve_contexts_node: { documents: DocumentData[][] };
  generate_answer_node: { answer: string[] };
  grade_answer_node: {
    grade: ('useful' | 'useless' | 'hallucination')[];
    feedback: string[];
  };
  analyze_failure_node: { failure_analysis: string };
};

/**
 * ストリーム通信で利用するノードの部分的なレスポンス
 */
export type NodeOutput = Partial<NodeOutputBase>;

/**
 * Rag API (/api/chat-stream) のリクエストボディ
 */
export type ChatStreamRequest = {
  question: string;
};

/**
 * 画面表示用に最適化した回答の評価結果
 */
export type GradeInfo = {
  grade: 'useful' | 'useless' | 'hallucination' | string;
  feedback: string;
};
