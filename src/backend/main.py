from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import aiomysql
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain_cohere import CohereRerank
from config import settings
from api.endpoints.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = await aiomysql.create_pool(minsize=2, maxsize=5, **settings.db_config)
    app.state.db_pool = pool

    embedding = OpenAIEmbeddings(model=settings.OPENAI_EMBEDDING_MODEL_NAME)
    chroma_client = Chroma(
        embedding_function=embedding, persist_directory=settings.PERSIST_DIRECTORY
    )
    app.state.chroma_client = chroma_client

    cohere_reranker = CohereRerank(model=settings.COHERE_MODEL_NAME, top_n=5)
    app.state.cohere_reranker = cohere_reranker
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
