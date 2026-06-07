from services.rag.schemas import GraphState
from services.rag.chains import (
    generate_queries_chain,
    generate_answer_chain,
    grade_answer_chain,
    analyze_failure_chain,
)
from services.rag.utils import reciprocal_rank_fusion
from langchain_core.runnables import RunnableConfig
from api.endpoints.deps import get_logicFn_logger

logger = get_logicFn_logger()


async def generate_queries_node(state: GraphState, config: RunnableConfig):
    """
    質問を複数のクエリに変換するノード。
    Args:
        state (GraphState): 現在のグラフの状態
    Returns:
        dict: 生成されたクエリ {"queries": list[list[str]]}
    """

    user_id = state.get("user_id", "unknown_user")
    request_id = state.get("request_id", "unknown_request")
    retry_count = state.get("retry_count", 0) + 1
    question = state.get("question")

    feedback = state.get("feedback")

    if feedback:
        feedback = f"フィードバック: {feedback[-1]}"
    else:
        feedback = ""

    queries = await generate_queries_chain.ainvoke(
        {"question": state.get("question"), "feedback": feedback}, config=config
    )

    logger.info(
        f"[generate_queries_node] Finished. | User: {user_id} | Request: {request_id} |"
        f"Retry_count: {retry_count} |"
        f"Question: {question[:50]} | "
        f"Feedback: {feedback[7:57] if feedback else 'None'} |"
        f"Queries: {queries}"
    )
    return {"queries": [queries], "retry_count": retry_count}


async def retrieve_contexts_node(state: GraphState, config: RunnableConfig):
    """
    クエリを基に情報検索してcontextsを検索するノード。
    Args:
        state (GraphState): 現在のグラフの状態
        config (RunnableConfig): chromaとcohereのインスタンス
    Returns:
        dict: 検索されたドキュメント {"documents": list[list[Document]]}
    """
    user_id = state.get("user_id", "unknown_user")
    request_id = state.get("request_id", "unknown_request")
    retriever = config.get("configurable", {}).get("retriever")
    reranker = config.get("configurable", {}).get("reranker")

    if not retriever or not reranker:
        raise ValueError("RetrieverまたはRerankerが設定されていません。")

    queries = state.get("queries")[-1]

    raw_docs = await retriever.map().ainvoke(queries)
    total_raw_count = sum(len(docs) for docs in raw_docs)
    fused_docs = reciprocal_rank_fusion(raw_docs)

    selected_docs = await reranker.acompress_documents(
        fused_docs, state.get("question")
    )
    doc_sources = [
        doc.metadata.get("filename", "unknown_file") for doc in selected_docs
    ]
    logger.info(
        f"[retrieve_contexts_node] Finished. | "
        f"User: {user_id} | Request: {request_id} | "
        f"Queries: {queries} |"
        f"Filtered: {total_raw_count} -> {len(selected_docs)} |"
        f"Selected Doc Srcs: {doc_sources}"
    )
    return {"documents": [selected_docs]}


# documentsを基に回答を生成するノード
async def generate_answer_node(state: GraphState):
    """
    documentsを基に回答を生成するノード。
    Args:
        state (GraphState): 現在のグラフの状態
    Returns:
        dict: 生成された回答 {"answer": str}
    """
    user_id = state.get("user_id", "unknown_user")
    request_id = state.get("request_id", "unknown_request")
    retry_count = state.get("retry_count", 0)
    current_docs = state.get("documents")[-1] if state.get("documents") else []
    answer = await generate_answer_chain.ainvoke(
        {"question": state.get("question"), "context": current_docs}
    )
    doc_sources = [doc.metadata.get("filename", "unknown") for doc in current_docs]
    clean_answer = answer.replace("\n", " ")
    logger.info(
        f"[generate_answer_node] Finished. | "
        f"User: {user_id} | Request: {request_id} | "
        f"Retry_count: {retry_count} | "
        f"Doc Srcs: {doc_sources} | "
        f"Answer : {clean_answer[:50]}"
    )
    return {"answer": [answer]}


async def grade_answer_node(state: GraphState):
    """
    生成された回答を評価するノード。
    Args:
        state (GraphState): 現在のグラフの状態
    Returns:
        dict: 評価結果と評価理由 {"grade": str, "feedback": str, "retry_count": int}
    """
    user_id = state.get("user_id", "unknown_user")
    request_id = state.get("request_id", "unknown_request")
    retry_count = state.get("retry_count", 0)
    result = await grade_answer_chain.ainvoke(
        {
            "question": state.get("question"),
            "answer": state.get("answer")[-1],
            "context": state.get("documents")[-1],
        }
    )
    clean_feedback = result.feedback.replace("\n", " ") if result.feedback else "None"
    logger.info(
        f"[grade_answer_node] Finished. | "
        f"User: {user_id} | Request: {request_id} | "
        f"Retry_count: {retry_count} | "
        f"Grade: {result.grade} | "
        f"Feedback: {clean_feedback[:50]}"
    )
    return {
        "grade": [result.grade],
        "feedback": [result.feedback],
    }


async def analyze_failure_node(state: GraphState):
    """
    複数回の回答生成を行っても十分な回答が得られない場合に、原因分析するノード。
    Args:
        state (GraphState): 現在のグラフの状態
    Returns:
        dict: 分析結果 {"failure_analysis": str}
    """
    user_id = state.get("user_id", "unknown_user")
    request_id = state.get("request_id", "unknown_request")
    retry_count = state.get("retry_count", 0)
    analysis = await analyze_failure_chain.ainvoke(
        {
            "question": state.get("question"),
            "initial_queries": state.get("queries")[0],
            "initial_context": state.get("documents")[0],
            "initial_feedback": state.get("feedback")[0],
            "retry_feedback": state.get("feedback")[-1],
        }
    )
    clean_analysis = analysis.replace("\n", " ") if analysis else "None"
    logger.warning(
        f"[analyze_failure_node] Finished. | "
        f"User: {user_id} | Request: {request_id} | "
        f"Retry_count: {retry_count} | "
        f"Analysis: {clean_analysis[:50]}"
    )

    return {"failure_analysis": analysis}
