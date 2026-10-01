import os
import re
import uuid
from pathlib import Path
from typing import Any, Dict, Tuple
import httpx
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

LOCAL_STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage" / "resumes"
AVATARS_STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage" / "avatars"
LOGOS_STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage" / "logos"


def get_supabase_config() -> Tuple[str, str, str]:
    supabase_url = (os.getenv("SUPABASE_URL") or "").rstrip("/")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or ""
    supabase_bucket = os.getenv("SUPABASE_BUCKET") or "resumes"
    return supabase_url, supabase_key, supabase_bucket


def sanitize_filename(filename: str) -> str:
    base = Path(filename).name
    cleaned = re.sub(r"[^a-zA-Z0-9_.-]", "_", base)
    return cleaned or "file"


def get_image_mime_type(ext: str, default_mime: str = "image/png") -> str:
    cleaned = ext.lower().lstrip(".")
    if cleaned == "png":
        return "image/png"
    if cleaned in ("jpg", "jpeg"):
        return "image/jpeg"
    if cleaned == "webp":
        return "image/webp"
    if cleaned == "svg":
        return "image/svg+xml"
    return default_mime or "application/octet-stream"


async def ensure_supabase_bucket(
    client: httpx.AsyncClient,
    supabase_url: str,
    supabase_key: str,
    bucket_name: str,
) -> bool:
    if not (supabase_url and supabase_key and bucket_name):
        return False
    try:
        bucket_endpoint = f"{supabase_url}/storage/v1/bucket/{bucket_name}"
        headers = {
            "Authorization": f"Bearer {supabase_key}",
            "apikey": supabase_key,
        }
        res = await client.get(bucket_endpoint, headers=headers)
        if res.status_code == 200:
            return True
        if res.status_code == 404:
            create_endpoint = f"{supabase_url}/storage/v1/bucket"
            create_res = await client.post(
                create_endpoint,
                headers={**headers, "Content-Type": "application/json"},
                json={"id": bucket_name, "name": bucket_name, "public": True},
            )
            return create_res.status_code in (200, 201)
    except Exception:
        pass
    return False


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

    supabase_url, supabase_key, supabase_bucket = get_supabase_config()
    file_url = None
    if supabase_key and supabase_url:
        endpoint = f"{supabase_url}/storage/v1/object/{supabase_bucket}/{storage_path}"
        headers = {
            "Authorization": f"Bearer {supabase_key}",
            "apikey": supabase_key,
            "Content-Type": mime,
            "x-upsert": "true",
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(endpoint, content=content, headers=headers)
                if res.status_code in (200, 201):
                    file_url = f"{supabase_url}/storage/v1/object/public/{supabase_bucket}/{storage_path}"
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

    supabase_url, supabase_key, supabase_bucket = get_supabase_config()
    file_url = None
    if supabase_key and supabase_url:
        endpoint = f"{supabase_url}/storage/v1/object/{supabase_bucket}/{storage_path}"
        headers = {
            "Authorization": f"Bearer {supabase_key}",
            "apikey": supabase_key,
            "Content-Type": mime,
            "x-upsert": "true",
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(endpoint, content=content, headers=headers)
                if res.status_code in (200, 201):
                    file_url = f"{supabase_url}/storage/v1/object/public/{supabase_bucket}/{storage_path}"
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


async def upload_company_logo_file(
    company_id: str,
    filename: str,
    content: bytes,
    content_type: str,
) -> Dict[str, Any]:
    safe_name = sanitize_filename(filename)
    ext = Path(safe_name).suffix.lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp", ".svg"):
        ext = ".png"

    storage_subpath = f"{company_id}/logo{ext}"
    storage_path = f"company-logos/{storage_subpath}"
    mime = get_image_mime_type(ext, content_type)

    supabase_url, supabase_key, supabase_bucket = get_supabase_config()
    file_url = None

    if supabase_url and supabase_key:
        endpoint = f"{supabase_url}/storage/v1/object/{supabase_bucket}/{storage_path}"
        headers = {
            "Authorization": f"Bearer {supabase_key}",
            "apikey": supabase_key,
            "Content-Type": mime,
            "x-upsert": "true",
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(endpoint, content=content, headers=headers)
                if res.status_code in (200, 201):
                    file_url = f"{supabase_url}/storage/v1/object/public/{supabase_bucket}/{storage_path}"
                elif res.status_code == 404:
                    created = await ensure_supabase_bucket(client, supabase_url, supabase_key, supabase_bucket)
                    if created:
                        retry_res = await client.post(endpoint, content=content, headers=headers)
                        if retry_res.status_code in (200, 201):
                            file_url = f"{supabase_url}/storage/v1/object/public/{supabase_bucket}/{storage_path}"
        except Exception:
            file_url = None

    # Graceful fallback to local storage if Supabase environment variables are missing or upload fails
    if not file_url:
        target_path = LOGOS_STORAGE_DIR / storage_subpath
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(content)
        file_url = f"/api/storage/logos/{storage_subpath}"

    return {
        "file_url": file_url,
        "file_name": f"logo{ext}",
        "storage_path": storage_path,
        "file_size": len(content),
        "content_type": mime,
    }


async def delete_storage_file(storage_path_or_url: str) -> None:
    if not storage_path_or_url:
        return

    supabase_url, supabase_key, supabase_bucket = get_supabase_config()
    clean_path = storage_path_or_url.split("?")[0].strip()

    is_supabase_url = "/storage/v1/object/public/" in clean_path
    if is_supabase_url:
        parts = clean_path.split(f"/{supabase_bucket}/", 1)
        if len(parts) > 1:
            clean_path = parts[1]
        else:
            return
    elif clean_path.startswith("http://") or clean_path.startswith("https://"):
        return
    elif clean_path.startswith("/api/storage/"):
        clean_path = clean_path.replace("/api/storage/", "", 1)
        if clean_path.startswith("resumes/"):
            clean_path = clean_path.replace("resumes/", "", 1)
        elif clean_path.startswith("logos/"):
            clean_path = clean_path.replace("logos/", "", 1)
        elif clean_path.startswith("avatars/"):
            clean_path = clean_path.replace("avatars/", "", 1)

    if supabase_url and supabase_key and clean_path and not clean_path.startswith("/"):
        try:
            endpoint = f"{supabase_url}/storage/v1/object/{supabase_bucket}/{clean_path}"
            headers = {
                "Authorization": f"Bearer {supabase_key}",
                "apikey": supabase_key,
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
        LOGOS_STORAGE_DIR / clean_path.replace("company-logos/", "", 1),
    ]

    for p in candidate_paths:
        try:
            if p.exists() and p.is_file():
                p.unlink()
                parent = p.parent
                if parent != LOCAL_STORAGE_DIR and parent != AVATARS_STORAGE_DIR and parent != LOGOS_STORAGE_DIR and parent != base_storage:
                    if parent.exists() and not any(parent.iterdir()):
                        parent.rmdir()
        except Exception:
            pass


