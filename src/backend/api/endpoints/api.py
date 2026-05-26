from fastapi import APIRouter
from api.endpoints import documents, system

api_router = APIRouter()
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
