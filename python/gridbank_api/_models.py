"""Models shared by the clients in this package."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Creator:
    username: str
    id: str
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
    purchased_at: Optional[int] = None


@dataclass
class CreatorResult:
    """A creator from Partner API creator search, with a selection of their videos."""

    creator: Creator
    is_top_creator: bool = False
    clips_count: int = 0
    is_favorited: bool = False
    videos: List[Video] = field(default_factory=list)
