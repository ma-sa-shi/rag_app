from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500, chunk_overlap=50, separators=["\n\n", "\n", " ", ""]
)


def run_chroma_ingest(
    chroma_client, doc_id: int, file_name: str, extracted_text: str
) -> None:

    text_chunks = text_splitter.split_text(extracted_text)

    documents = []
    ids = []
    for i, chunk in enumerate(text_chunks):
        doc = Document(
            page_content=chunk,
            metadata={
                "doc_id": doc_id,
                "file_name": file_name,
            },
        )
        documents.append(doc)

        ids.append(f"{doc_id}_{i}")

    chroma_client.add_documents(documents=documents, ids=ids)
