from fastapi import APIRouter, status, HTTPException, Depends, Header
from aiomysql import Connection
from langchain_chroma import Chroma
from core.chroma import run_chroma_ingest
from schemas.documents import IngestResponse
from api.endpoints.deps import get_db_connection, get_chroma_client, get_docs_logger

router = APIRouter()


@router.post(
    "/{doc_id}/embeddings",
    status_code=status.HTTP_200_OK,
)
async def ingest_document(
    doc_id: int,
    x_user_id: int | None = Header(..., alias="X-User-Id"),
    x_request_id: str | None = Header(..., alias="X-Request-Id"),
    conn: Connection = Depends(get_db_connection),
    chroma_client: Chroma = Depends(get_chroma_client),
    logger=Depends(get_docs_logger),
) -> IngestResponse:

    async with conn.cursor() as cursor:
        query = "SELECT filename, extracted_text FROM docs WHERE doc_id = %s AND delete_flg = FALSE"
        await cursor.execute(query, [doc_id])
        row = await cursor.fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="ドキュメントが見つかりません"
        )

    logger.info(
        "[ingest_documents] Processing. Document_ID: %s, Filename: %s",
        doc_id,
        row.get("filename"),
        extra={"user_id": x_user_id, "request_id": x_request_id},
    )
    update_doc_status = "UPDATE docs SET status = %s WHERE doc_id = %s"
    try:
        await run_chroma_ingest(
            chroma_client=chroma_client,
            doc_id=doc_id,
            filename=row.get("filename"),
            extracted_text=row.get("extracted_text"),
            user_id=x_user_id,
            request_id=x_request_id,
        )
        async with conn.cursor() as cursor:
            await cursor.execute(update_doc_status, ["ingested", doc_id])

        return IngestResponse(
            status=status.HTTP_200_OK,
            message=f"{row.get('filename')}の取込みを完了しました",
        )
    except Exception as e:
        async with conn.cursor() as cursor:
            await cursor.execute(update_doc_status, ["failed", doc_id])
            logger.error(
                "[ingest_documents]Ingestion failed. Doc_ID: %s, Error: %s",
                doc_id,
                str(e),
                extra={"user_id": x_user_id, "request_id": x_request_id},
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"{row.get('filename')}の取込みに失敗しました。",
        )
