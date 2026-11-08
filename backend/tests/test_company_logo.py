import io
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import get_db
from backend.auth import get_current_recruiter, get_current_user
from backend.models import Company, Recruiter, User

PNG_HEADER = b"\x89PNG\r\n\x1a\n" + b"\x00" * 50
JPEG_HEADER = b"\xff\xd8\xff\xe0" + b"\x00" * 50
WEBP_HEADER = b"RIFF" + b"\x00\x00\x00\x00" + b"WEBP" + b"\x00" * 50

@pytest.fixture
def mock_db_session():
    from unittest.mock import MagicMock
    session = MagicMock()
    return session

def test_upload_logo_success(mock_db_session):
    company = Company(
        id="c326f213-26b4-4c9d-b02a-32bbb9806ed8",
        name="Test Corp",
        logo_url="https://yyrihnpnlvkmnlgoikrw.supabase.co/storage/v1/object/public/company-logos/companies/c326f213-26b4-4c9d-b02a-32bbb9806ed8/old_logo.png"
    )
    recruiter = Recruiter(
        id="63d18e3b-d89a-4403-bb88-14b0671f4e72",
        company_id=company.id,
        user_id="user-1"
    )

    mock_db_session.query.return_value.filter.return_value.first.return_value = company

    app.dependency_overrides[get_db] = lambda: mock_db_session
    app.dependency_overrides[get_current_recruiter] = lambda: recruiter

    client = TestClient(app)

    new_public_url = "https://yyrihnpnlvkmnlgoikrw.supabase.co/storage/v1/object/public/company-logos/companies/c326f213-26b4-4c9d-b02a-32bbb9806ed8/new_logo.png"
    upload_mock = AsyncMock(return_value={
        "file_url": new_public_url,
        "file_name": "new_logo.png",
        "storage_path": "company-logos/companies/c326f213-26b4-4c9d-b02a-32bbb9806ed8/new_logo.png",
        "file_size": len(PNG_HEADER),
        "content_type": "image/png"
    })
    delete_mock = AsyncMock()

    with patch("backend.routers.companies.upload_company_logo_file", upload_mock), \
         patch("backend.routers.companies.delete_storage_file", delete_mock):
        response = client.post(
            "/api/companies/my/logo",
            files={"file": ("test.png", PNG_HEADER, "image/png")}
        )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["logo_url"] == new_public_url
    assert company.logo_url == new_public_url
    mock_db_session.commit.assert_called_once()
    delete_mock.assert_awaited_once()

def test_upload_logo_file_size_exceeded(mock_db_session):
    company = Company(
        id="c326f213-26b4-4c9d-b02a-32bbb9806ed8",
        name="Test Corp",
        logo_url="https://example.com/logo.png"
    )
    recruiter = Recruiter(
        id="63d18e3b-d89a-4403-bb88-14b0671f4e72",
        company_id=company.id,
        user_id="user-1"
    )
    mock_db_session.query.return_value.filter.return_value.first.return_value = company

    app.dependency_overrides[get_db] = lambda: mock_db_session
    app.dependency_overrides[get_current_recruiter] = lambda: recruiter

    client = TestClient(app)

    oversized_content = PNG_HEADER + b"\x00" * (2 * 1024 * 1024 + 10)
    response = client.post(
        "/api/companies/my/logo",
        files={"file": ("huge.png", oversized_content, "image/png")}
    )

    app.dependency_overrides.clear()

    assert response.status_code == 400
    assert "2MB" in response.json()["detail"]
    assert company.logo_url == "https://example.com/logo.png"

def test_upload_logo_invalid_type(mock_db_session):
    company = Company(
        id="c326f213-26b4-4c9d-b02a-32bbb9806ed8",
        name="Test Corp",
        logo_url="https://example.com/logo.png"
    )
    recruiter = Recruiter(
        id="63d18e3b-d89a-4403-bb88-14b0671f4e72",
        company_id=company.id,
        user_id="user-1"
    )
    mock_db_session.query.return_value.filter.return_value.first.return_value = company

    app.dependency_overrides[get_db] = lambda: mock_db_session
    app.dependency_overrides[get_current_recruiter] = lambda: recruiter

    client = TestClient(app)

    response = client.post(
        "/api/companies/my/logo",
        files={"file": ("document.pdf", b"%PDF-1.4...", "application/pdf")}
    )

    app.dependency_overrides.clear()

    assert response.status_code == 400
    assert "Invalid image format" in response.json()["detail"]
    assert company.logo_url == "https://example.com/logo.png"

def test_upload_logo_corrupted_magic_bytes(mock_db_session):
    company = Company(
        id="c326f213-26b4-4c9d-b02a-32bbb9806ed8",
        name="Test Corp",
        logo_url="https://example.com/logo.png"
    )
    recruiter = Recruiter(
        id="63d18e3b-d89a-4403-bb88-14b0671f4e72",
        company_id=company.id,
        user_id="user-1"
    )
    mock_db_session.query.return_value.filter.return_value.first.return_value = company

    app.dependency_overrides[get_db] = lambda: mock_db_session
    app.dependency_overrides[get_current_recruiter] = lambda: recruiter

    client = TestClient(app)

    fake_png = b"NOT_A_REAL_PNG_HEADER_DATA"
    response = client.post(
        "/api/companies/my/logo",
        files={"file": ("fake.png", fake_png, "image/png")}
    )

    app.dependency_overrides.clear()

    assert response.status_code == 400
    assert "signature" in response.json()["detail"]
    assert company.logo_url == "https://example.com/logo.png"

def test_upload_preserves_logo_on_failure(mock_db_session):
    original_logo = "https://example.com/original.png"
    company = Company(
        id="c326f213-26b4-4c9d-b02a-32bbb9806ed8",
        name="Test Corp",
        logo_url=original_logo
    )
    recruiter = Recruiter(
        id="63d18e3b-d89a-4403-bb88-14b0671f4e72",
        company_id=company.id,
        user_id="user-1"
    )
    mock_db_session.query.return_value.filter.return_value.first.return_value = company

    app.dependency_overrides[get_db] = lambda: mock_db_session
    app.dependency_overrides[get_current_recruiter] = lambda: recruiter

    client = TestClient(app)

    upload_mock = AsyncMock(side_effect=RuntimeError("Supabase connection timeout"))
    delete_mock = AsyncMock()

    with patch("backend.routers.companies.upload_company_logo_file", upload_mock), \
         patch("backend.routers.companies.delete_storage_file", delete_mock):
        response = client.post(
            "/api/companies/my/logo",
            files={"file": ("valid.png", PNG_HEADER, "image/png")}
        )

    app.dependency_overrides.clear()

    assert response.status_code == 502
    assert company.logo_url == original_logo
    delete_mock.assert_not_called()
    mock_db_session.commit.assert_not_called()

