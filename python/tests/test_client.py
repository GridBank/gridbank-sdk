import pytest
import respx
import httpx
from datetime import datetime, timezone

from gridbank_api import (
    GridbankClient,
    GridbankAPIError,
    Creator,
    Video,
    VideoListResponse,
    DownloadResult,
    UsageSummary,
    PingResponse,
)

BASE = "https://api2.gridbank.io"

CREATOR = {"username": "testuser", "name": "Test User", "bio": None, "profile_image": None}
VIDEO = {
    "id": "vid_1",
    "title": "Test Video",
    "description": "A test video",
    "duration": 30.5,
    "width": 1920,
    "height": 1080,
    "url": "https://example.com/video.mp4",
    "thumbnail": "https://example.com/thumb.jpg",
    "creator": CREATOR,
    "location": None,
    "keywords": ["nature", "landscape"],
}


@pytest.fixture
def client():
    return GridbankClient(api_key="apik_test")


@respx.mock
def test_auth_header(client):
    route = respx.get(f"{BASE}/external/ping").mock(
        return_value=httpx.Response(200, json={"ping": "pong"})
    )
    client.ping()
    assert route.calls[0].request.headers["authorization"] == "Bearer apik_test"


@respx.mock
def test_ping(client):
    respx.get(f"{BASE}/external/ping").mock(
        return_value=httpx.Response(200, json={"ping": "pong", "timestamp": "2026-06-08T12:00:00Z"})
    )
    result = client.ping()
    assert isinstance(result, PingResponse)
    assert result.ping == "pong"
    assert isinstance(result.timestamp, datetime)


@respx.mock
def test_ping_no_timestamp(client):
    respx.get(f"{BASE}/external/ping").mock(
        return_value=httpx.Response(200, json={"ping": "pong"})
    )
    result = client.ping()
    assert result.ping == "pong"
    assert result.timestamp is None


@respx.mock
def test_search_videos(client):
    respx.get(f"{BASE}/external/v1/videos/search").mock(
        return_value=httpx.Response(200, json={
            "search_id": "srch_1",
            "page": 1,
            "per_page": 15,
            "has_more": False,
            "videos": [VIDEO],
        })
    )
    result = client.search_videos(q="nature")
    assert isinstance(result, VideoListResponse)
    assert result.search_id == "srch_1"
    assert len(result.videos) == 1
    video = result.videos[0]
    assert isinstance(video, Video)
    assert video.id == "vid_1"
    assert video.duration == 30.5
    assert isinstance(video.creator, Creator)
    assert video.creator.username == "testuser"
    assert video.keywords == ["nature", "landscape"]


@respx.mock
def test_get_video(client):
    respx.get(f"{BASE}/external/v1/videos/vid_1").mock(
        return_value=httpx.Response(200, json=VIDEO)
    )
    result = client.get_video("vid_1")
    assert isinstance(result, Video)
    assert result.id == "vid_1"
    assert result.title == "Test Video"
    assert result.creator.username == "testuser"


@respx.mock
def test_download_video(client):
    respx.get(f"{BASE}/external/v1/videos/vid_1/download").mock(
        return_value=httpx.Response(200, json={
            "video_id": "vid_1",
            "url": "https://cdn.example.com/vid_1.mp4?sig=abc",
            "expires_at": "2026-06-08T17:00:00Z",
            "file_size": 104857600,
            "format": "mp4",
        })
    )
    result = client.download_video("vid_1")
    assert isinstance(result, DownloadResult)
    assert result.video_id == "vid_1"
    assert result.format == "mp4"
    assert result.file_size == 104857600
    assert isinstance(result.expires_at, datetime)


@respx.mock
def test_usage_summary(client):
    respx.get(f"{BASE}/external/v1/usage/me").mock(
        return_value=httpx.Response(200, json={
            "customer_id": "cust_1",
            "tier": "growth",
            "lease_period_start": "2026-06-01T00:00:00Z",
            "lease_period_end": "2026-07-01T00:00:00Z",
            "downloads_this_period": 42,
            "active_collections_count": 3,
            "wildcard_enabled": False,
            "top_videos": [
                {"video_id": "vid_1", "download_count": 10, "thumbnail": None}
            ],
        })
    )
    result = client.usage_summary()
    assert isinstance(result, UsageSummary)
    assert result.tier == "growth"
    assert result.downloads_this_period == 42
    assert len(result.top_videos) == 1
    assert result.top_videos[0].video_id == "vid_1"


@respx.mock
def test_error_raises_gridbank_api_error(client):
    respx.get(f"{BASE}/external/v1/videos/missing").mock(
        return_value=httpx.Response(404, json={"detail": "Video not found"})
    )
    with pytest.raises(GridbankAPIError) as exc_info:
        client.get_video("missing")
    assert exc_info.value.status_code == 404
    assert "Video not found" in exc_info.value.message


@respx.mock
def test_context_manager(client):
    respx.get(f"{BASE}/external/ping").mock(
        return_value=httpx.Response(200, json={"ping": "pong"})
    )
    with GridbankClient(api_key="apik_test") as c:
        result = c.ping()
    assert result.ping == "pong"
