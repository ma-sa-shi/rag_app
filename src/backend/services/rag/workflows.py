import json
from typing import AsyncGenerator
from langgraph.graph import StateGraph, END
from fastapi.encoders import jsonable_encoder
from services.rag.nodes import (
    generate_queries_node,
    retrieve_contexts_node,
    generate_answer_node,
    grade_answer_node,
    analyze_failure_node,
)
from services.rag.schemas import GraphState


def decide_to_finish(state: GraphState):
    """
    評価結果に基づいて、ワークフローの次のステップを決定する関数。
    Args:
        state (GraphState): 現在のグラフの状態
    Returns:
        str: 次のステップ ("finish", "force_finish", "retry")
    """
    if state.get("grade")[-1] == "useful":
        return "finish"

    if state.get("retry_count") == 2:
        return "force_finish"

    return "retry"


workflow = StateGraph(GraphState)

workflow.add_node(generate_queries_node)
workflow.add_node(retrieve_contexts_node)
workflow.add_node(generate_answer_node)
workflow.add_node(grade_answer_node)
workflow.add_node(analyze_failure_node)

workflow.set_entry_point("generate_queries_node")
workflow.add_edge("generate_queries_node", "retrieve_contexts_node")
workflow.add_edge("retrieve_contexts_node", "generate_answer_node")
workflow.add_edge("generate_answer_node", "grade_answer_node")

workflow.add_conditional_edges(
    "grade_answer_node",
    decide_to_finish,
    {
        "finish": END,
        "force_finish": "analyze_failure_node",
        "retry": "generate_queries_node",
    },
)
workflow.add_edge("analyze_failure_node", END)

compiled = workflow.compile()


async def generate_stream(question: str, config: dict) -> AsyncGenerator[str, None]:
    """
    ワークフローを実行し、生成された回答をストリームで返す非同期ジェネレーター関数。
    Args:
        question (str): ユーザーからの質問
        config (dict): chroma, cohereのインスタンス
    Yields:
        str: GraphState
    """
    async for output in compiled.astream(
        {"question": question}, config=config, stream_mode="updates"
    ):
        # Documentオブジェクトも辞書型に平滑化し、json.dumpsが扱える型に変換
        serializable_output = jsonable_encoder(output)
        yield f"data: {json.dumps(serializable_output, ensure_ascii=False)}\n\n"
