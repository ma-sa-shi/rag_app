import json
import pytest
import asyncio
from httpx import AsyncClient


@pytest.mark.asyncio(loop_scope="session")
async def test_chat_stream_success(client: AsyncClient, test_app, auth_headers):
    chroma_client = test_app.state.chroma_client
    chroma_client.add_texts(
        texts=[
            "Pytestのfixtureは事前準備や事後処理を行う関数です。scope='session'を指定すると、テストセッション全体で1回だけ実行されます。scope='function'を指定すると、各テスト関数ごとに実行されます。"
        ],
    )
    await asyncio.sleep(1.0)
    payload = {
        "question": "Pytestのfixtureでscope='session'とscope='function'の違いは何ですか?"
    }
    response = await client.post(
        "/api/chats/stream", headers=auth_headers, json=payload
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

    passed_nodes = []
    answer_received = False
    grade = None

    async for line in response.aiter_lines():
        if not line or not line.startswith("data: "):
            continue

        json_str = line[6:]
        if not json_str.strip():
            continue

        output_data = json.loads(json_str)

        for node_name, state_delta in output_data.items():
            passed_nodes.append(node_name)

            if "answer" in state_delta and state_delta["answer"]:
                answer = state_delta["answer"][-1]
                if answer:
                    answer_received = True

            if "grade" in state_delta and state_delta["grade"]:
                grade = state_delta["grade"][-1]

    assert "generate_answer_node" in passed_nodes, (
        "generate_answer_nodeは完了しませんでした"
    )

    assert answer_received, "Streamに回答が含まれていません"

    assert grade == "useful", (
        "登録した情報に関する質問に対する回答がusefulと判定されませんでした"
    )


@pytest.mark.asyncio(loop_scope="session")
async def test_chat_stream_failure(client: AsyncClient, auth_headers):
    payload = {"question": "Poetryの利点は何ですか?"}

    response = await client.post(
        "/api/chats/stream", headers=auth_headers, json=payload
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
    passed_nodes = []
    answer_received = False
    grade = None

    async for line in response.aiter_lines():
        if not line or not line.startswith("data: "):
            continue

        json_str = line[6:]
        if not json_str.strip():
            continue

        output_data = json.loads(json_str)

        for node_name, state_delta in output_data.items():
            passed_nodes.append(node_name)

            if "answer" in state_delta and state_delta["answer"]:
                answer = state_delta["answer"][-1]
                if answer:
                    answer_received = True

            if "grade" in state_delta and state_delta["grade"]:
                grade = state_delta["grade"][-1]

    assert "generate_answer_node" in passed_nodes, (
        "generate_answer_nodeは完了しませんでした"
    )

    assert answer_received, "Streamに回答が含まれていません"

    assert "analyze_failure_node" in passed_nodes, (
        "analyze_failure_nodeは完了しませんでした"
    )

    assert grade == "useless", (
        "uselessと判定されるべき回答がuselessと判定されませんでした"
    )
