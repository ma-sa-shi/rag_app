export type DocumentData = {
  id: string;
  page_content: string;
  metadata: {
    doc_id: string | number;
    relevance_score: number;
    filename: string;
  };
  type: string;
};

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

export type NodeOutput = Partial<NodeOutputBase>;
