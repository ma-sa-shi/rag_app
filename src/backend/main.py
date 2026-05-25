from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
import aiomysql
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from config import settings
from api.endpoints.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = await aiomysql.create_pool(
        host=settings.DB_HOST,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        db=settings.DB_NAME,
        port=settings.DB_PORT,
        charset="utf8mb4",
        cursorclass=aiomysql.DictCursor,  # 辞書形式で結果を取得
        minsize=2,  # 初期接続数
        maxsize=5,  # 最大接続数
        autocommit=True,
    )
    app.state.db_pool = pool

    embedding = OpenAIEmbeddings(model=settings.OPENAI_EMBEDDING_MODEL_NAME)
    chroma_client = Chroma(
        embedding_function=embedding, persist_directory=settings.PERSIST_DIRECTORY
    )
    app.state.chroma_client = chroma_client

    try:
        yield
    finally:
        pool.close()
        await pool.wait_closed()

app = FastAPI(
    title="backend for AI processing",
    description="AI処理用のバックエンド",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix="/api")

@app.get("/health", tags=["health"], status_code=status.HTTP_200_OK)
def health_check():
    return {"status": "ok", "message": "FastAPI server is running"}
