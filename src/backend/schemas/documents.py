from pydantic import BaseModel, Field


class IngestResponse(BaseModel):
    status: str = Field(..., description="処理結果ステータス")
    message: str | None = Field(None, description="詳細メッセージ")
