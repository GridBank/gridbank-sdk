"""Models shared by the clients in this package."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional


@dataclass
class Creator:
    username: str
    id: str = ""
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
