"""GridBank API Python SDK — type signatures only. Implementation ships post-launch."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Creator:
    id: str
    name: str
    username: str
    bio: str
    profile_image: str


@dataclass
class Location:
    city: str
    region: str
    country: str


@dataclass
class Video:
    id: str
    title: str
    description: str
    duration: float
    width: int
    height: int
    url: str
    thumbnail: str
    creator: Creator
    location: Location
    content_tier: str
    created_at: datetime
    is_featured: bool
    keywords: list[str]


@dataclass
class SearchResult:
    videos: list[Video]
    has_more: bool
    search_id: str


@dataclass
class DownloadResult:
    url: str
    expires_at: datetime


@dataclass
class UsageSummary:
    downloads_this_period: int
    tier: str
    lease_period_end: datetime


class GridbankAPIError(Exception):
    code: str
    message: str
    details: Optional[dict]

    def __init__(self, code: str, message: str, details: Optional[dict] = None) -> None:
        ...


class GridbankClient:
    def __init__(self, api_key: str) -> None:
        ...

    def search_videos(
        self,
        q: str,
        sort: str = "relevant",
        page: int = 1,
        per_page: int = 15,
        duration_min: Optional[int] = None,
        duration_max: Optional[int] = None,
        theme: Optional[str] = None,
    ) -> SearchResult:
        ...

    def get_video(self, video_id: str) -> Video:
        ...

    def download_video(
        self,
        video_id: str,
        expires_in: int = 5,
        search_id: Optional[str] = None,
    ) -> DownloadResult:
        ...

    def usage_summary(self) -> UsageSummary:
        ...
