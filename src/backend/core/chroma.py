from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from api.endpoints.deps import get_logicFn_logger

logger = get_logicFn_logger()

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500, chunk_overlap=50, separators=["\n\n", "\n", " ", ""]
)


async def run_chroma_ingest(
    chroma_client,
    doc_id: int,
    filename: str,
    extracted_text: str,
    user_id: str,
    request_id: str,
) -> None:
    """
    Chromaにドキュメントを保存する関数
    Args:
        chroma_client: Chromaのインスタンス
        doc_id (int): ドキュメントID
        filename (str): ファイル名
        extracted_text (str): ドキュメントから抽出されたテキスト
        user_id (str): ユーザーID
        request_id (str): リクエストID
    Returns:
        None
    """
    logger.info(
        "[run_chroma_ingest] Started. Document_ID: %s, Filename: %s",
        doc_id,
        filename,
        extra={"user_id": user_id, "request_id": request_id},
    )
    try:
        text_chunks = text_splitter.split_text(extracted_text)

        documents = []
        ids = []
        for i, chunk in enumerate(text_chunks):
            chunk_id = f"{doc_id}_{i}"
            doc = Document(
                page_content=chunk,
                id=chunk_id,
                metadata={
                    "doc_id": doc_id,
                    "filename": filename,
                },
            )
            documents.append(doc)

            ids.append(chunk_id)

        await chroma_client.aadd_documents(documents=documents, ids=ids)
        logger.info(
            "[run_chroma_ingest] Finished. Document_ID: %s, Chunks_count: %s",
            doc_id,
            len(documents),
            extra={"user_id": user_id, "request_id": request_id},
        )
    except Exception as e:
        logger.exception(
            "[run_chroma_ingest] Failed. Document_ID: %s, FileName: %s",
            doc_id,
            filename,
            extra={"user_id": user_id, "request_id": request_id},
        )
        raise e
