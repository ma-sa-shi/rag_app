from pydantic import BaseModel, Field


class IngestResponse(BaseModel):
    status: int = Field(..., description="HTTPステータスコード")
    message: str | None = Field(None, description="処理結果のメッセージ")
