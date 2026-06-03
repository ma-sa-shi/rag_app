import shutil
import tempfile
import pytest_asyncio
import pytest
import asyncio
import aiomysql
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain_cohere import CohereRerank

from main import app as dev_app
from config import settings


@pytest.fixture(scope="session")
def event_loop():
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()


# DBのみ上書き
TEST_DB_CONFIG = settings.db_config.copy()
TEST_DB_CONFIG["db"] = f"{settings.MYSQL_DATABASE}_test"


# dev_appをテスト用mysqlとchroma, cohereで上書き
@pytest_asyncio.fixture(scope="session")
async def test_app():
    pool = await aiomysql.create_pool(minsize=1, maxsize=2, **TEST_DB_CONFIG)
    dev_app.state.db_pool = pool

    async with pool.acquire() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            await cursor.execute("TRUNCATE TABLE docs")
            await cursor.execute("TRUNCATE TABLE users")
            await cursor.execute("SET FOREIGN_KEY_CHECKS = 1")

    test_dir = tempfile.mkdtemp()
    dev_app.state.chroma_client = Chroma(
        embedding_function=OpenAIEmbeddings(model=settings.OPENAI_EMBEDDING_MODEL_NAME),
        persist_directory=test_dir,
    )
    dev_app.state.cohere_reranker = CohereRerank(
        model=settings.COHERE_MODEL_NAME, top_n=5
    )

    yield dev_app

    pool.close()
    await pool.wait_closed()
    del dev_app.state.chroma_client
    try:
        shutil.rmtree(test_dir)
    except PermissionError:
        pass


# 非同期のHTTPリクエストを送信するためのテスト用クライアント
@pytest_asyncio.fixture(scope="session")
async def client(test_app: FastAPI):
    async with AsyncClient(
        transport=ASGITransport(app=test_app), base_url="http://test"
    ) as ac:
        yield ac


# クリーンアップ
@pytest_asyncio.fixture(scope="function")
async def db_connection(test_app: FastAPI):
    pool = test_app.state.db_pool
    async with pool.acquire() as conn:
        try:
            yield conn
        finally:
            async with conn.cursor() as cursor:
                await cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
                await cursor.execute("TRUNCATE TABLE docs")
                await cursor.execute("TRUNCATE TABLE users")
                await cursor.execute("SET FOREIGN_KEY_CHECKS = 1")


# テストユーザーの作成
@pytest_asyncio.fixture(scope="function")
async def test_user(db_connection):
    user_id = 1000
    username = "username"
    hashed_password = "hashed_password"
    async with db_connection.cursor() as cursor:
        await cursor.execute(
            "INSERT INTO users (user_id, username, hashed_password) VALUES (%s, %s, %s)",
            (user_id, username, hashed_password),
        )
    yield user_id
