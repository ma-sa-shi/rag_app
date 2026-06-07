from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from api.endpoints.deps import get_logicFn_logger

logger = get_logicFn_logger()

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500, chunk_overlap=50, separators=["\n\n", "\n", " ", ""]
)


def run_chroma_ingest(
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
        request_id (str): セッションID
    Returns:
        None
    """
    logger.info(
        f"[run_chroma_ingest] Started. | User: {user_id} | Request: {request_id} | Document: {doc_id} | Filename: {filename}"
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

        chroma_client.add_documents(documents=documents, ids=ids)
        logger.info(
            f"[run_chroma_ingest] Finished | User: {user_id} | Request: {request_id} | Chunks: {len(documents)}"
        )
    except Exception as e:
        logger.exception(
            f"[run_chroma_ingest] Error | User: {user_id} | Request: {request_id} | Document: {doc_id} | Filename: {filename} | Error: {str(e)}"
        )
