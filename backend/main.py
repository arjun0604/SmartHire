import sys
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

workspace_dir = Path(__file__).resolve().parent.parent
if str(workspace_dir) not in sys.path:
    sys.path.insert(0, str(workspace_dir))

from backend.routers.applications import router as applications_router
from backend.routers.auth import router as auth_router
from backend.routers.candidates import router as candidates_router
from backend.routers.companies import router as companies_router
from backend.routers.jobs import router as jobs_router
from backend.routers.matches import router as matches_router
from backend.routers.resumes import router as resumes_router
from backend.routers.saved_jobs import router as saved_jobs_router
from backend.routers.skills import router as skills_router
from backend.routers.questions import router as questions_router
from backend.routers.candidate_assessments import router as candidate_assessments_router

app = FastAPI(
    title="SmartHire API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin") or "*"
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc) or "Internal server error"},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )

storage_dir = Path(__file__).resolve().parent / "storage"
storage_dir.mkdir(parents=True, exist_ok=True)
app.mount("/api/storage", StaticFiles(directory=str(storage_dir)), name="storage")

app.include_router(auth_router, prefix="/api")
app.include_router(companies_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(saved_jobs_router, prefix="/api")
app.include_router(applications_router, prefix="/api")
app.include_router(matches_router, prefix="/api")
app.include_router(resumes_router, prefix="/api")
app.include_router(candidates_router, prefix="/api")
app.include_router(skills_router, prefix="/api")
app.include_router(questions_router, prefix="/api")
app.include_router(candidate_assessments_router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "SmartHire API is running"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}
