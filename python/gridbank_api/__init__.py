"""GridBank API Python SDK."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, List, Optional

import httpx

_BASE_URL = "https://api2.gridbank.io"


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

@dataclass
class Creator:
    username: str
    name: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None


@dataclass
class Location:
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None


@dataclass
class Video:
    id: str
    creator: Creator
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    url: Optional[str] = None
    thumbnail: Optional[str] = None
    location: Optional[Location] = None
    keywords: Optional[List[str]] = None


@dataclass
class VideoListResponse:
    search_id: str
    page: int
    per_page: int
    has_more: bool
    videos: List[Video]


@dataclass
class DownloadResult:
    video_id: str
    url: str
    expires_at: datetime
    file_size: int
    format: str


@dataclass
class TopVideo:
    video_id: str
    download_count: int
    thumbnail: Optional[str] = None


@dataclass
class UsageSummary:
    customer_id: str
    tier: str
    lease_period_start: datetime
    lease_period_end: datetime
    downloads_this_period: int
    active_collections_count: int
    wildcard_enabled: bool
    top_videos: List[TopVideo]


@dataclass
class PingResponse:
    ping: str
    timestamp: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Error
# ---------------------------------------------------------------------------

class GridbankAPIError(Exception):
    def __init__(self, status_code: int, message: str, details: Optional[Any] = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.details = details


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

def _dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _creator(data: dict) -> Creator:
    return Creator(
        username=data["username"],
        name=data.get("name"),
        bio=data.get("bio"),
        profile_image=data.get("profile_image"),
    )


def _location(data: Optional[dict]) -> Optional[Location]:
    if not data:
        return None
    return Location(city=data.get("city"), region=data.get("region"), country=data.get("country"))


def _video(data: dict) -> Video:
    return Video(
        id=data["id"],
        creator=_creator(data["creator"]),
        title=data.get("title"),
        description=data.get("description"),
        duration=data.get("duration"),
        width=data.get("width"),
        height=data.get("height"),
        url=data.get("url"),
        thumbnail=data.get("thumbnail"),
        location=_location(data.get("location")),
        keywords=data.get("keywords"),
    )


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

class GridbankClient:
    def __init__(self, api_key: str, *, base_url: str = _BASE_URL) -> None:
        self._http = httpx.Client(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_key}"},
        )

    def _get(self, path: str, params: Optional[dict] = None) -> Any:
        filtered = {k: v for k, v in (params or {}).items() if v is not None}
        try:
            response = self._http.get(path, params=filtered)
        except httpx.RequestError as exc:
            raise GridbankAPIError(0, str(exc)) from exc
        if not response.is_success:
            body = response.json() if "application/json" in response.headers.get("content-type", "") else {}
            detail = body.get("detail", response.text) if isinstance(body, dict) else response.text
            raise GridbankAPIError(response.status_code, detail, body)
        try:
            return response.json()
        except Exception as exc:
            raise GridbankAPIError(
                response.status_code,
                f"Server returned a non-JSON response: {exc}",
            ) from exc

    def ping(self) -> PingResponse:
        data = self._get("/external/ping")
        return PingResponse(
            ping=data["ping"],
            timestamp=_dt(data["timestamp"]) if data.get("timestamp") else None,
        )

    def search_videos(
        self,
        q: str,
        *,
        sort: str = "relevant",
        page: int = 1,
        per_page: int = 15,
        duration_min: Optional[int] = None,
        duration_max: Optional[int] = None,
        theme: Optional[str] = None,
        search_id: Optional[str] = None,
    ) -> VideoListResponse:
        data = self._get("/external/v1/videos/search", {
            "q": q,
            "sort": sort,
            "page": page,
            "per_page": per_page,
            "duration_min": duration_min,
            "duration_max": duration_max,
            "theme": theme,
            "search_id": search_id,
        })
        return VideoListResponse(
            search_id=data["search_id"],
            page=data["page"],
            per_page=data["per_page"],
            has_more=data["has_more"],
            videos=[_video(v) for v in data["videos"]],
        )

    def get_video(self, video_id: str) -> Video:
        return _video(self._get(f"/external/v1/videos/{video_id}"))

    def download_video(
        self,
        video_id: str,
        *,
        expires_in: int = 5,
        search_id: Optional[str] = None,
    ) -> DownloadResult:
        data = self._get(f"/external/v1/videos/{video_id}/download", {
            "expires_in": expires_in,
            "search_id": search_id,
        })
        return DownloadResult(
            video_id=data["video_id"],
            url=data["url"],
            expires_at=_dt(data["expires_at"]),
            file_size=data["file_size"],
            format=data["format"],
        )

    def usage_summary(self) -> UsageSummary:
        data = self._get("/external/v1/usage/me")
        return UsageSummary(
            customer_id=data["customer_id"],
            tier=data["tier"],
            lease_period_start=_dt(data["lease_period_start"]),
            lease_period_end=_dt(data["lease_period_end"]),
            downloads_this_period=data["downloads_this_period"],
            active_collections_count=data["active_collections_count"],
            wildcard_enabled=data["wildcard_enabled"],
            top_videos=[
                TopVideo(
                    video_id=v["video_id"],
                    download_count=v["download_count"],
                    thumbnail=v.get("thumbnail"),
                )
                for v in data["top_videos"]
            ],
        )

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> GridbankClient:
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()
