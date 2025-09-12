from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import chat, files, search

app = FastAPI(title="New Interface Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(files.router, prefix="/api/files", tags=["files"])
app.include_router(search.router, prefix="/api/search", tags=["search"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
