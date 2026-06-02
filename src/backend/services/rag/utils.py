from langchain_core.documents import Document


def reciprocal_rank_fusion(
    retriever_outputs: list[list[Document]], k: int = 60, top_n: int = 20
) -> list[Document]:
    """
    相互順位融合を実行する関数
    Args:
        retriever_outputs (list[list[Document]]): retrieverの出力結果のリスト
        k (int): RRFに使用するパラメータ
        top_n (int): 返すドキュメントの数
    Returns:
        list[Document]: ドキュメントのリスト
    """
    # { doc_id: {score: スコア, document: Documentオブジェクト} }
    doc_score_map = {}

    for docs in retriever_outputs:
        for rank, doc in enumerate(docs):
            doc.id
            if doc.id not in doc_score_map:
                doc_score_map[doc.id] = {"score": 0.0, "document": doc}
            doc_score_map[doc.id]["score"] += 1 / (rank + k)

    sorted_items = sorted(
        doc_score_map.items(),
        key=lambda x: x[1]["score"],
        reverse=True,  # 降順
    )

    reranked_docs = [item[1]["document"] for item in sorted_items[:top_n]]

    return reranked_docs
