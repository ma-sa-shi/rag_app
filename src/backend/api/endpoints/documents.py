from fastapi import APIRouter, BackgroundTasks, status, HTTPException, Depends, Header
from aiomysql import Connection
from langchain_chroma import Chroma
from core.chroma import run_chroma_ingest
from schemas.documents import IngestResponse
from api.endpoints.deps import get_db_connection, get_chroma_client, get_docs_logger

router = APIRouter()


@router.post(
    "/{doc_id}/embeddings",
    response_model=IngestResponse,
    status_code=status.HTTP_200_OK,
)
async def ingest_document(
    doc_id: int,
    background_tasks: BackgroundTasks,
    x_user_id: int | None = Header(..., alias="X-User-Id"),
    x_request_id: str | None = Header(..., alias="X-Request-Id"),
    conn: Connection = Depends(get_db_connection),
    chroma_client: Chroma = Depends(get_chroma_client),
    logger=Depends(get_docs_logger),
) -> IngestResponse:

    async with conn.cursor() as cursor:
        query = "SELECT filename, extracted_text FROM docs WHERE doc_id = %s AND delete_flg = FALSE"
        await cursor.execute(query, (doc_id,))
        row = await cursor.fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="ドキュメントが見つかりません"
        )

    logger.info(
        f"[ingest_documents] User: {x_user_id} | Request: {x_request_id} | Document: {doc_id} | Filename: {row.get('filename')}"
    )

    background_tasks.add_task(
        run_chroma_ingest,
        chroma_client=chroma_client,
        doc_id=doc_id,
        filename=row.get("filename"),
        extracted_text=row.get("extracted_text"),
        user_id=x_user_id,
        request_id=x_request_id,
    )

    return IngestResponse(
        status="success", message=f"{row.get('filename')}の取り込みを開始しました"
    )
