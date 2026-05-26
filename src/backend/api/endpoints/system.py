from fastapi import APIRouter, status, HTTPException, Depends, Request
from aiomysql import Connection
from api.endpoints.deps import get_db_connection

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    return {"status": "success", "message": "FastAPI server is running"}


@router.get("/db-test", status_code=status.HTTP_200_OK)
async def db_test(conn: Connection = Depends(get_db_connection)):
    try:
        async with conn.cursor() as cur:
            await cur.execute("SELECT 1;")
            result = await cur.fetchone()
            return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database connection failed: {str(e)}",
        )


@router.get("/chroma-test", status_code=status.HTTP_200_OK)
async def test_chroma(request: Request):
    try:
        chroma_client = request.app.state.chroma_client

        _ = chroma_client.similarity_search("ping", k=1)

        return {"status": "success", "message": "Chroma connection is healthy"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chroma connection failed: {str(e)}",
        )
