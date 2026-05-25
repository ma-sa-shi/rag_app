from typing import AsyncGenerator
from fastapi import Request


async def get_db_connection(request: Request) -> AsyncGenerator:
    pool = request.app.state.db_pool
    async with pool.acquire() as connection:
        try:
            yield connection
        except Exception:
            await connection.rollback()
            raise
