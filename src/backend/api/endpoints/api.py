from fastapi import APIRouter
from api.endpoints import chats, documents, system

api_router = APIRouter()
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
api_router.include_router(chats.router, prefix="/chats", tags=["chats"])
