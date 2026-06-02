from fastapi import APIRouter, BackgroundTasks, status, HTTPException, Depends
from aiomysql import Connection
from langchain_chroma import Chroma
from core.chroma import run_chroma_ingest
from schemas.documents import IngestResponse
from api.endpoints.deps import get_db_connection, get_chroma_client

router = APIRouter()


@router.post(
    "/{doc_id}/embeddings",
    response_model=IngestResponse,
    status_code=status.HTTP_200_OK,
)
async def ingest_document(
    doc_id: int,
    background_tasks: BackgroundTasks,
    conn: Connection = Depends(get_db_connection),
    chroma_client: Chroma = Depends(get_chroma_client),
) -> IngestResponse:

    async with conn.cursor() as cursor:
        query = "SELECT filename, extracted_text FROM docs WHERE doc_id = %s AND delete_flg = FALSE"
        await cursor.execute(query, (doc_id,))
        row = await cursor.fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="ドキュメントが見つかりません"
        )

    background_tasks.add_task(
        run_chroma_ingest,
        chroma_client=chroma_client,
        doc_id=doc_id,
        filename=row.get("filename"),
        extracted_text=row.get("extracted_text"),
    )

    return IngestResponse(
        status="success", message=f"{row.get('filename')}の取り込みを開始しました"
    )
