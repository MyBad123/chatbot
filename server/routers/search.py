from fastapi import APIRouter, Query
from typing import List
import time

router = APIRouter()

@router.get("")
async def web_search(q: str = Query(..., description="Search query")):
    # Simulated search results
    results = [
        {"title": "Result 1", "url": "https://example.com/1", "snippet": f"Snippet about {q} #1"},
        {"title": "Result 2", "url": "https://example.com/2", "snippet": f"Snippet about {q} #2"},
        {"title": "Result 3", "url": "https://example.com/3", "snippet": f"Snippet about {q} #3"},
    ]
    return {"results": results}
