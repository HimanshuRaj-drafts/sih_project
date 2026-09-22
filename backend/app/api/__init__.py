# backend/app/api/__init__.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from dotenv import load_dotenv

load_dotenv()

from .process import router as process_router
from .documents import router as documents_router
from .backend_routes import router as evidence_router
from app.services import init_services

# Initialize FastAPI app
app = FastAPI(
    title="NCRB Secure Docs API",
    description="Secure Digital Document Management System for NCRB (SIH 26190)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Using wildcard to guarantee Vercel connectivity during the live demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup() -> None:
    logging.getLogger("uvicorn").info("Starting NCRB Secure Docs API - initializing services")
    try:
        init_services()
    except Exception:
        logging.exception("Service initialization failed; continuing in degraded mode")

# Register routers for Stations 1 & 4
app.include_router(process_router, prefix="/process", tags=["Processing"])
app.include_router(documents_router, prefix="/documents", tags=["Documents"])
app.include_router(evidence_router)  # Already has prefix="/api/v1/evidence"
# Backwards-compatible root-level access for document routes used by older tests and clients.
app.include_router(documents_router, tags=["Documents"], include_in_schema=False)

@app.get("/")
def root():
    return {"message": "NCRB Secure Docs API is live 🚀"}