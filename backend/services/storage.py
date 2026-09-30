import os
import re
import uuid
from pathlib import Path
from typing import Any, Dict
import httpx
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://yyrihnpnlvkmnlgoikrw.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "resumes")
LOCAL_STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage" / "resumes"


def sanitize_filename(filename: str) -> str:
    base = Path(filename).name
    cleaned = re.sub(r"[^a-zA-Z0-9_.-]", "_", base)
    return cleaned or "resume.pdf"


async def upload_resume_file(
    candidate_id: str,
    filename: str,
    content: bytes,
    content_type: str,
) -> Dict[str, Any]:
    safe_name = sanitize_filename(filename)
    unique_prefix = uuid.uuid4().hex
    storage_path = f"{candidate_id}/{unique_prefix}_{safe_name}"
    mime = content_type or "application/octet-stream"

    file_url = None
    if SUPABASE_KEY and SUPABASE_URL:
        endpoint = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/{SUPABASE_BUCKET}/{storage_path}"
        headers = {
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "apikey": SUPABASE_KEY,
            "Content-Type": mime,
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(endpoint, content=content, headers=headers)
                if res.status_code in (200, 201):
                    file_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{SUPABASE_BUCKET}/{storage_path}"
        except Exception:
            file_url = None

    if not file_url:
        target_path = LOCAL_STORAGE_DIR / storage_path
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(content)
        file_url = f"/api/storage/resumes/{storage_path}"

    return {
        "file_url": file_url,
        "file_name": filename,
        "storage_path": storage_path,
        "file_size": len(content),
        "content_type": mime,
    }




AVATARS_STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage" / "avatars"


async def upload_avatar_file(
    user_id: str,
    filename: str,
    content: bytes,
    content_type: str,
) -> Dict[str, Any]:
    safe_name = sanitize_filename(filename)
    unique_prefix = uuid.uuid4().hex[:8]
    storage_subpath = f"{user_id}/{unique_prefix}_{safe_name}"
    storage_path = f"avatars/{storage_subpath}"
    mime = content_type or "image/jpeg"

    file_url = None
    if SUPABASE_KEY and SUPABASE_URL:
        endpoint = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/{SUPABASE_BUCKET}/{storage_path}"
        headers = {
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "apikey": SUPABASE_KEY,
            "Content-Type": mime,
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(endpoint, content=content, headers=headers)
                if res.status_code in (200, 201):
                    file_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{SUPABASE_BUCKET}/{storage_path}"
        except Exception:
            file_url = None

    if not file_url:
        target_path = AVATARS_STORAGE_DIR / storage_subpath
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(content)
        file_url = f"/api/storage/avatars/{storage_subpath}"

    return {
        "file_url": file_url,
        "file_name": filename,
        "storage_path": storage_path,
        "file_size": len(content),
        "content_type": mime,
    }


LOGOS_STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage" / "logos"


async def upload_company_logo_file(
    company_id: str,
    filename: str,
    content: bytes,
    content_type: str,
) -> Dict[str, Any]:
    safe_name = sanitize_filename(filename)
    unique_prefix = uuid.uuid4().hex[:8]
    storage_subpath = f"{company_id}/{unique_prefix}_{safe_name}"
    storage_path = f"logos/{storage_subpath}"
    mime = content_type or "image/png"

    file_url = None
    if SUPABASE_KEY and SUPABASE_URL:
        endpoint = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/{SUPABASE_BUCKET}/{storage_path}"
        headers = {
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "apikey": SUPABASE_KEY,
            "Content-Type": mime,
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(endpoint, content=content, headers=headers)
                if res.status_code in (200, 201):
                    file_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{SUPABASE_BUCKET}/{storage_path}"
        except Exception:
            file_url = None

    if not file_url:
        target_path = LOGOS_STORAGE_DIR / storage_subpath
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(content)
        file_url = f"/api/storage/logos/{storage_subpath}"

    return {
        "file_url": file_url,
        "file_name": filename,
        "storage_path": storage_path,
        "file_size": len(content),
        "content_type": mime,
    }


async def delete_storage_file(storage_path_or_url: str) -> None:
    if not storage_path_or_url:
        return

    clean_path = storage_path_or_url
    if "/storage/v1/object/public/" in clean_path:
        parts = clean_path.split(f"/{SUPABASE_BUCKET}/", 1)
        if len(parts) > 1:
            clean_path = parts[1]
    elif clean_path.startswith("/api/storage/"):
        clean_path = clean_path.replace("/api/storage/", "", 1)
        if clean_path.startswith("resumes/"):
            clean_path = clean_path.replace("resumes/", "", 1)

    if SUPABASE_KEY and SUPABASE_URL:
        try:
            endpoint = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/{SUPABASE_BUCKET}/{clean_path}"
            headers = {
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "apikey": SUPABASE_KEY,
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                await client.delete(endpoint, headers=headers)
        except Exception:
            pass

    base_storage = Path(__file__).resolve().parent.parent / "storage"
    candidate_paths = [
        LOCAL_STORAGE_DIR / clean_path,
        base_storage / clean_path,
        AVATARS_STORAGE_DIR / clean_path.replace("avatars/", "", 1),
        LOGOS_STORAGE_DIR / clean_path.replace("logos/", "", 1),
    ]

    for p in candidate_paths:
        try:
            if p.exists() and p.is_file():
                p.unlink()
                parent = p.parent
                if parent != LOCAL_STORAGE_DIR and parent != AVATARS_STORAGE_DIR and parent != base_storage:
                    if parent.exists() and not any(parent.iterdir()):
                        parent.rmdir()
        except Exception:
            pass


