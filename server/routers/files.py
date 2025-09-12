from fastapi import APIRouter, UploadFile, File
from typing import List

router = APIRouter()

@router.post("/upload")
async def upload(files: List[UploadFile] = File(...)):
    saved = []
    for f in files:
        content = await f.read()
        saved.append({"filename": f.filename, "size": len(content)})
    return {"uploaded": saved}
