from fastapi import APIRouter, status, Depends
from fastapi.responses import StreamingResponse
from services.rag.workflows import generate_stream
from api.endpoints.deps import get_chroma_client
from schemas.rag import ChatRequest
from fastapi import Request


router = APIRouter()


@router.post("/stream", status_code=status.HTTP_200_OK)
async def chat_stream(
    request: Request, payload: ChatRequest, chroma=Depends(get_chroma_client)
):
    retriever = chroma.as_retriever(search_kwargs={"k": 5})
    cohere_reranker = request.app.state.cohere_reranker

    config = {"configurable": {"retriever": retriever, "reranker": cohere_reranker}}

    return StreamingResponse(
        generate_stream(payload.question, config), media_type="text/event-stream"
    )
