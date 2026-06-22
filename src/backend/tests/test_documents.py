import pytest
from fastapi import status
from httpx import AsyncClient
from aiomysql import Connection


@pytest.mark.asyncio(loop_scope="session")
async def test_ingest_document_success(
    client: AsyncClient, db_connection: Connection, test_app, test_user, auth_headers
):

    doc_id = 1000
    filename = "test.txt"
    extracted_text = "pytest.mark.asyncioは非同期テスト関数を定義するためのデコレーターです。loop_scope='session'を指定すると、テストセッション全体で同じイベントループが使用されます。"

    async with db_connection.cursor() as cursor:
        await cursor.execute(
            "INSERT INTO docs (doc_id, user_id, filename, extracted_text, status, delete_flg) VALUES (%s, %s, %s, %s, %s, %s)",
            [doc_id, test_user, filename, extracted_text, "processing", False],
        )

    response = await client.post(
        f"/api/documents/{doc_id}/embeddings", headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == status.HTTP_200_OK

    async with db_connection.cursor() as cursor:
        await cursor.execute("SELECT status FROM docs WHERE doc_id = %s", [doc_id])
        row = await cursor.fetchone()
        assert row.get("status") == "ingested"

    chroma_client = test_app.state.chroma_client
    search_results = await chroma_client.asimilarity_search(
        "pytest.mark.asyncioでloop_scope='session'とすると、どうなりますか", k=1
    )
    assert len(search_results) > 0
    assert (
        "テストセッション全体で同じイベントループが使用されます。"
        in search_results[0].page_content
    )


@pytest.mark.asyncio(loop_scope="session")
async def test_ingest_document_not_found(client: AsyncClient, auth_headers):

    doc_id = 1000
    response = await client.post(
        f"/api/documents/{doc_id}/embeddings", headers=auth_headers
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "ドキュメントが見つかりません"


@pytest.mark.asyncio(loop_scope="session")
async def test_ingest_document_deleted(
    client: AsyncClient, db_connection: Connection, test_user, auth_headers
):

    doc_id = 1000

    async with db_connection.cursor() as cursor:
        await cursor.execute(
            "INSERT INTO docs (doc_id, user_id, filename, extracted_text, delete_flg) VALUES (%s, %s, %s, %s, %s)",
            [doc_id, test_user, "deleted.txt", "削除済みテキスト", True],
        )

    response = await client.post(
        f"/api/documents/{doc_id}/embeddings", headers=auth_headers
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "ドキュメントが見つかりません"
