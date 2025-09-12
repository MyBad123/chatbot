from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, List, Any, AsyncGenerator
import asyncio
import time

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str
    type: str = "text"  # text, table, file, etc.

class SendRequest(BaseModel):
    chat_id: str
    message: str
    mode: str = "default"

# In-memory storage for demo purposes
chats: Dict[str, List[ChatMessage]] = {}

@router.post("/send")
async def send_message(req: SendRequest):
    messages = chats.setdefault(req.chat_id, [])
    user_msg = ChatMessage(role="user", content=req.message)
    messages.append(user_msg)
    return {"ok": True}

async def stream_tokens(answer: str) -> AsyncGenerator[bytes, None]:
    # Simulate token streaming; emit event: data: <json>\n\n
    for ch in answer:
        payload = {"type": "token", "content": ch}
        yield f"data: {payload}\n\n".encode("utf-8")
        await asyncio.sleep(0.02)
    yield f"data: {{'type': 'end'}}\n\n".encode("utf-8")

async def sse_generator(chat_id: str) -> AsyncGenerator[bytes, None]:
    # Compose a demo response mixing token stream and a table chunk
    answer = "Это стриминговый ответ от ассистента. "
    async for chunk in stream_tokens(answer):
        yield chunk
    # Send a table block as a whole element
    table_block = {
        "type": "table",
        "headers": ["Колонка", "Значение"],
        "rows": [["A", "1"], ["B", "2"], ["C", "3"]],
    }
    yield f"data: {table_block}\n\n".encode("utf-8")
    yield b"data: {\"type\": \"end\"}\n\n"

@router.get("/stream/{chat_id}")
async def stream(chat_id: str):
    return StreamingResponse(sse_generator(chat_id), media_type="text/event-stream")

@router.get("/history/{chat_id}")
async def history(chat_id: str):
    return {"messages": [m.dict() for m in chats.get(chat_id, [])]}

@router.get("/list")
async def list_chats():
    return {"chat_ids": list(chats.keys())}
