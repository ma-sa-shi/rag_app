from typing import AsyncGenerator
import aiomysql
from fastapi import Request
from langchain_chroma import Chroma


async def get_db_connection(
    request: Request,
) -> AsyncGenerator[aiomysql.Connection, None]:
    pool = request.app.state.db_pool
    async with pool.acquire() as connection:
        try:
            yield connection
        except Exception:
            await connection.rollback()
            raise


def get_chroma_client(request: Request) -> Chroma:
    return request.app.state.chroma_client
