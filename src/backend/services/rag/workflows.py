import json
from typing import AsyncGenerator
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from fastapi import Request
from fastapi.encoders import jsonable_encoder
from services.rag.nodes import (
    generate_queries_node,
    retrieve_contexts_node,
    generate_answer_node,
    grade_answer_node,
    analyze_failure_node,
)
from services.rag.schemas import GraphState
from api.endpoints.deps import get_logicFn_logger
from services.rag.repository import save_chat_result


def decide_to_finish(state: GraphState):
    """
    評価結果に基づいて、ワークフローの次のステップを決定する関数。
    Args:
        state (GraphState): 現在のグラフの状態
    Returns:
        str: 次のステップ ("finish", "force_finish", "retry")
    """
    user_id = state.get("user_id", "unknown_user")
    request_id = state.get("request_id", "unknown_request")
    retry_count = state.get("retry_count")
    current_grade = state.get("grade")[-1]

    if current_grade == "useful":
        logger.info(
            "[decide_to_finish] Finished. Grade is useful.",
            extra={"user_id": user_id, "request_id": request_id},
        )
        return "finish"

    if retry_count == 1:
        logger.info(
            "[decide_to_finish] Reached max retry.",
            extra={"user_id": user_id, "request_id": request_id},
        )
        return "force_finish"

    logger.info(
        "[decide_to_finish] Retried. Grade: %s, Retry_count: %s",
        current_grade,
        retry_count,
        extra={"user_id": user_id, "request_id": request_id},
    )
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
memory = MemorySaver()
compiled = workflow.compile(checkpointer=memory)

logger = get_logicFn_logger()


async def generate_stream(
    question: str, config: dict, request: Request
) -> AsyncGenerator[str, None]:
    """
    ワークフローを実行し、生成された回答をストリームで返す非同期ジェネレーター関数。
    Args:
        question (str): ユーザーからの質問
        config (dict): chroma, cohereのインスタンス
        request (Request): FastAPIのリクエストオブジェクト
    Yields:
        str: GraphState
    """
    configurable = config.get("configurable", {})
    user_id = configurable.get("user_id", "unknown_user")
    request_id = configurable.get("request_id", "unknown_request")
    if "thread_id" not in configurable:
        config["configurable"]["thread_id"] = request_id
    logger.info(
        "[generate_stream] Started. Question: %s",
        question[:50],
        extra={"user_id": user_id, "request_id": request_id},
    )
    try:
        async for output in compiled.astream(
            {
                "question": question,
                "user_id": user_id,
                "request_id": request_id,
                "retry_count": 0,
            },
            config=config,
            stream_mode="updates",
        ):
            # Documentオブジェクトも辞書型に平滑化し、json.dumpsが扱える型に変換
            serializable_output = jsonable_encoder(output)
            yield f"data: {json.dumps(serializable_output, ensure_ascii=False)}\n\n"

            graph_state_snapshot = await compiled.aget_state(config)
        final_state = graph_state_snapshot.values
        if final_state:
            await save_chat_result(request_id, user_id, final_state, request)

        logger.info(
            "[generate_stream] Finished.",
            extra={"user_id": user_id, "request_id": request_id},
        )
    except Exception as e:
        logger.exception(
            "[generate_stream] Failed.",
            extra={"user_id": user_id, "request_id": request_id},
        )
        raise e
