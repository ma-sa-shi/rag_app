from pydantic_settings import BaseSettings, SettingsConfigDict
import aiomysql


class Settings(BaseSettings):
    MYSQL_HOST: str
    MYSQL_PORT: int
    MYSQL_DATABASE: str
    MYSQL_USER: str
    MYSQL_PASSWORD: str
    PERSIST_DIRECTORY: str
    LOG_DIR: str = "/app/log"
    COHERE_MODEL_NAME: str = "rerank-v3.5"
    COHERE_API_KEY: str
    OPENAI_MODEL_NAME: str = "gpt-5-nano"
    OPENAI_EMBEDDING_MODEL_NAME: str = "text-embedding-3-small"
    OPENAI_API_KEY: str
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore"
    )

    @property
    def db_config(self) -> dict:
        """一般ユーザー用の基本接続設定"""
        return {
            "host": self.MYSQL_HOST,
            "port": self.MYSQL_PORT,
            "user": self.MYSQL_USER,
            "password": self.MYSQL_PASSWORD,
            "db": self.MYSQL_DATABASE,
            "charset": "utf8mb4",
            "cursorclass": aiomysql.DictCursor,
            "autocommit": True,
        }


settings = Settings()
