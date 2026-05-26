from typing import AsyncGenerator
import aiomysql
from fastapi import Request


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
