import json
from itertools import zip_longest
from fastapi import Request
from fastapi.encoders import jsonable_encoder
from api.endpoints.deps import get_db_connection
from services.rag.schemas import GraphState


async def save_chat_result(request_id, user_id, state: GraphState, request: Request):
    question = state.get("question")
    retry_count = state.get("retry_count", 0)
    final_answer = state["answer"][-1] if state.get("answer") else None
    final_grade = state["grade"][-1] if state.get("grade") else None

    async for conn in get_db_connection(request):
        async with conn.cursor() as cursor:
            try:
                history_query = "INSERT INTO chat_histories (request_id, user_id, question, final_answer, final_grade, retry_count) VALUES (%s, %s, %s, %s, %s, %s)"
                await cursor.execute(
                    history_query,
                    (
                        request_id,
                        user_id,
                        question,
                        final_answer,
                        final_grade,
                        retry_count,
                    ),
                )
                chat_id = cursor.lastrowid

                detail_query = """
                    INSERT INTO chat_details (
                        chat_id, request_id, retry_count, generate_queries,
                        retrieved_documents, generate_answer, node_grade,
                        node_feedback, failure_analysis
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                # zip_longestは最長リストに合わせてループし、短いリストはNoneを補完する
                for i, (queries, docs, answer, grade, feedback) in enumerate(
                    zip_longest(
                        state.get("queries", []),
                        state.get("documents", []),
                        state.get("answer", []),
                        state.get("grade", []),
                        state.get("feedback", []),
                    )
                ):
                    queries_json = queries_json = json.dumps(
                        jsonable_encoder(queries or []), ensure_ascii=False
                    )
                    docs_json = json.dumps(
                        jsonable_encoder(docs or []), ensure_ascii=False
                    )
                    is_last = i == len(state.get("queries", [])) - 1
                    failure_analysis = (
                        state.get("failure_analysis") if is_last else None
                    )
                    await cursor.execute(
                        detail_query,
                        (
                            chat_id,
                            request_id,
                            i,
                            queries_json,
                            docs_json,
                            answer,
                            grade,
                            feedback,
                            failure_analysis,
                        ),
                    )
            except Exception as e:
                raise e
