from typing import Annotated, Literal, TypedDict
import operator
from pydantic import BaseModel, Field
from langchain_core.documents import Document


class MultiQuery(BaseModel):
    """
    LLMが生成する複数の検索クエリを表すクラス。
    Attributes:
        queries (list[str]): LLMが生成する検索クエリのリスト。3~5個のクエリが必要。
    """

    queries: list[str] = Field(
        ..., min_length=3, max_length=5, description="LLMが生成する検索クエリ"
    )


class GradeAnswer(BaseModel):
    """
    LLMが生成する回答の評価を表すクラス。
    Attributes:
        grade (Literal["useful", "useless", "hallucination"]): 質問に対する回答の評価。"useful"、"useless"、"hallucination"のいずれか。
        feedback (str): 評価理由。
    """

    grade: Literal["useful", "useless", "hallucination"] = Field(
        ..., description="質問に対する回答の評価"
    )
    feedback: str = Field(..., description="評価理由")


class GraphState(TypedDict):
    """
    ワークフローの状態を表すクラス。
    Attributes:
        question (str): ユーザーからの質問
        queries (list[list[str]]): LLMが生成する検索クエリのリスト。1列目に初回のクエリ、2列目以降に再試行のクエリが入る。
        documents (list[list[Document]]): ベクトルストアから検索されたドキュメントのリスト。1列目に初回のドキュメント、2列目以降に再試行のドキュメントが入る。
        answer (list[str]): LLMが生成する回答。1列目に初回の回答、2列目以降に再試行の回答が入る。
        grade (list[str]): LLMが生成する回答の評価。1列目に初回の評価、2列目以降に再試行の評価が入る。
        feedback (list[str]): LLMが生成する回答の評価理由。1列目に初回の評価理由、2列目以降に再試行の評価理由が入る。
        retry_count (int): ワークフローのループ回数。初回は0で、再試行するたびに1ずつ増加する。
        failure_analysis (str): 回答生成に失敗した場合の分析結果
        user_id (str): ユーザーID
        request_id (str): リクエストID
    """

    question: str
    queries: Annotated[list[list[str]], operator.add]
    documents: Annotated[list[list[Document]], operator.add]
    answer: Annotated[list[str], operator.add]
    grade: Annotated[list[str], operator.add]
    feedback: Annotated[list[str], operator.add]
    retry_count: int
    failure_analysis: str
    user_id: str
    request_id: str
