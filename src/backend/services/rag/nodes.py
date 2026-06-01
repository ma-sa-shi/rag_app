from services.rag.schemas import GraphState
from services.rag.chains import (
    generate_queries_chain,
    generate_answer_chain,
    grade_answer_chain,
    analyze_failure_chain,
)
from services.rag.utils import reciprocal_rank_fusion
from langchain_core.runnables import RunnableConfig


async def generate_queries_node(state: GraphState):
    """
    質問を複数のクエリに変換するノード。
    Args:
        state (GraphState): 現在のグラフの状態
    Returns:
        dict: 生成されたクエリ {"queries": list[list[str]]}
    """
    feedback = state.get("feedback")
    if feedback:
        feedback = f"フィードバック: {feedback[-1]}"
    else:
        feedback = ""

    queries = await generate_queries_chain.ainvoke(
        {"question": state.get("question"), "feedback": feedback}
    )

    return {
        "queries": [queries],
        "retry_count": state.get("retry_count", 0) + 1,
    }


async def retrieve_contexts_node(state: GraphState, config: RunnableConfig):
    """
    クエリを基に情報検索してcontextsを検索するノード。
    Args:
        state (GraphState): 現在のグラフの状態
        config (RunnableConfig): chromaとcohereのインスタンス
    Returns:
        dict: 検索されたドキュメント {"documents": list[list[Document]]}
    """
    retriever = config.get("configurable", {}).get("retriever")
    reranker = config.get("configurable", {}).get("reranker")

    if not retriever or not reranker:
        raise ValueError("RetrieverまたはRerankerが設定されていません。")

    queries = state.get("queries")[-1]

    raw_docs = await retriever.map().ainvoke(queries)
    fused_docs = reciprocal_rank_fusion(raw_docs)

    selected_docs = await reranker.acompress_documents(
        fused_docs, state.get("question")
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
    answer = await generate_answer_chain.ainvoke(
        {"question": state.get("question"), "context": state.get("documents")[-1]}
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
    result = await grade_answer_chain.ainvoke(
        {
            "question": state.get("question"),
            "answer": state.get("answer")[-1],
            "context": state.get("documents")[-1],
        }
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
    analysis = await analyze_failure_chain.ainvoke(
        {
            "question": state.get("question"),
            "initial_queries": state.get("queries")[0],
            "initial_context": state.get("documents")[0],
            "initial_feedback": state.get("feedback")[0],
            "retry_feedback": state.get("feedback")[-1],
        }
    )
    return {"failure_analysis": analysis}
