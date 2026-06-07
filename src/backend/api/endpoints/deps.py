from typing import AsyncGenerator
import aiomysql
from fastapi import Request
from langchain_chroma import Chroma
from logging import Logger
from core.logger import get_component_logger


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


def get_chats_logger() -> Logger:
    return get_component_logger("chats")


def get_docs_logger() -> Logger:
    return get_component_logger("documents")


def get_logicFn_logger() -> Logger:
    return get_component_logger("logic_function")
