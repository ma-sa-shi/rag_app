from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500, chunk_overlap=50, separators=["\n\n", "\n", " ", ""]
)


def run_chroma_ingest(
    chroma_client, doc_id: int, filename: str, extracted_text: str
) -> None:
    """
    Chromaにドキュメントを保存する関数
    Args:
        chroma_client: Chromaのインスタンス
        doc_id (int): ドキュメントID
        filename (str): ファイル名
        extracted_text (str): ドキュメントから抽出されたテキスト
    Returns:
        None
    """

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
