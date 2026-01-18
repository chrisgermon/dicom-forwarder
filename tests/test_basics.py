import pytest
import sys
import os
from unittest.mock import MagicMock, patch

# Add project root to path so we can import app modules
sys.path.append(os.getcwd())

@pytest.fixture
def mock_env():
    """Mock environment variables."""
    with patch.dict(os.environ, {
        "MCP_API_KEY": "test-key",
        "PORT": "8080",
        "GCP_PROJECT_ID": "test-project"
    }):
        yield

def test_startup_imports(mock_env):
    """Test that critical modules can be imported without error."""
    try:
        from app.core import config
        from app.core import logging_config
        from app.core import auth
    except ImportError as e:
        pytest.fail(f"Failed to import core modules: {e}")

@patch("google.cloud.secretmanager.SecretManagerServiceClient")
def test_config_secret_manager(mock_client):
    """Test environment variable fallback when Secret Manager fails."""
    from app.core.config import get_secret_sync
    
    # Mock exception when calling Secret Manager
    mock_client.return_value.access_secret_version.side_effect = Exception("API Error")
    
    # Should fallback to None or handle gracefully
    secret = get_secret_sync("TEST_SECRET")
    assert secret is None

def test_auth_middleware_init(mock_env):
    """Test Auth Middleware initialization."""
    from app.core.auth import APIKeyMiddleware
    from starlette.applications import Starlette
    
    app = Starlette()
    middleware = APIKeyMiddleware(app)
    
    assert middleware.PUBLIC_PATHS
    assert "/health" in middleware.PUBLIC_PATHS
