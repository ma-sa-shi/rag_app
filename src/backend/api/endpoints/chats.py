from fastapi import APIRouter, HTTPException, status, Depends, Header
from fastapi.responses import StreamingResponse
from services.rag.workflows import generate_stream
from api.endpoints.deps import get_chroma_client, get_chats_logger
from schemas.rag import ChatRequest
from fastapi import Request
from logging import Logger


router = APIRouter()


@router.post("/stream", status_code=status.HTTP_200_OK)
async def chat_stream(
    request: Request,
    payload: ChatRequest,
    x_user_id: int | None = Header(..., alias="X-User-Id"),
    x_request_id: str | None = Header(..., alias="X-Request-Id"),
    chroma=Depends(get_chroma_client),
    logger: Logger = Depends(get_chats_logger),
):
    logger.info(
        "[chat_stream] Started. Question: %s",
        payload.question[:50],
        extra={"user_id": x_user_id, "request_id": x_request_id},
    )
    if not x_user_id or x_request_id == "unknown_request":
        logger.warning(
            "[chat_stream] Blocked invalid request. Question: %s",
            payload.question[:50],
            extra={"user_id": x_user_id, "request_id": x_request_id},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-User-Id or X-Request-Id header",
        )

    try:
        retriever = chroma.as_retriever(search_kwargs={"k": 5})
        cohere_reranker = request.app.state.cohere_reranker

        config = {
            "configurable": {
                "retriever": retriever,
                "reranker": cohere_reranker,
                "request_id": x_request_id,
                "user_id": x_user_id,
            }
        }

        return StreamingResponse(
            generate_stream(payload.question, config, request),
            media_type="text/event-stream",
        )
    except Exception as e:
        logger.exception(
            "[chat_stream] Failed",
            extra={"user_id": x_user_id, "request_id": x_request_id},
        )
        raise e
