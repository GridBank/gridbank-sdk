"""Client for the GridBank Partner API.

Reads and downloads the videos your account has licensed. Separate from
:class:`gridbank_api.GridbankClient`, which serves leased collections to
enterprise contracts: different credential, different contract.

Create a key at https://gridbank.io/account/api-keys.

    from gridbank_api.partner import GridBankAPIClient

    client = GridBankAPIClient(api_key="apik_...")

    for video in client.content():
        client.download(video.video_key, f"{video.video_key}.mp4")

The raw API is three things away from comfortable, and this wraps exactly those:
paging is a cursor you have to thread through, a download URL expires after five
minutes, and an unlicensed video is a bare 403.
"""

from __future__ import annotations

import os
import shutil
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import IO, Any, Iterator, Optional, Union

import httpx

_BASE_URL = "https://api2.gridbank.io"
_PARTNER_PREFIX = "/partner/v1"
_DEFAULT_PER_PAGE = 50


@dataclass
class Creator:
    id: str
    username: Optional[str] = None
    name: Optional[str] = None


@dataclass
class Video:
    video_key: str
    creator: Creator
    title: Optional[str] = None
    duration_seconds: Optional[float] = None
    content_tier: int = 0
    purchased_at: Optional[int] = None
    preview_url: Optional[str] = None
    thumbnail_url: Optional[str] = None


class PartnerError(Exception):
    """Any non-success response from the Partner API."""

    def __init__(self, status_code: int, message: str, details: Optional[Any] = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.details = details


class NotLicensed(PartnerError):
    """The video exists on GridBank, but this account has not licensed it.

    Distinct from :class:`VideoNotFound` on purpose: this one is fixable by
    licensing the video, so it is worth catching separately from a bad key.
    """


class VideoNotFound(PartnerError):
    """No video with that key."""


class NotAuthenticated(PartnerError):
    """The API key is missing, malformed, or revoked."""


def _video(data: dict) -> Video:
    creator = data.get("creator") or {}
    return Video(
        video_key=data["video_key"],
        creator=Creator(
            id=creator.get("id", ""),
            username=creator.get("username"),
            name=creator.get("name"),
        ),
        title=data.get("title"),
        duration_seconds=data.get("duration_seconds"),
        content_tier=data.get("content_tier", 0),
        purchased_at=data.get("purchased_at"),
        preview_url=data.get("preview_url"),
        thumbnail_url=data.get("thumbnail_url"),
    )


class GridBankAPIClient:
    """Synchronous client. Safe to keep for the life of a process."""

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = _BASE_URL,
        timeout: float = 30.0,
        max_retries: int = 3,
        user_agent: Optional[str] = None,
    ) -> None:
        if not api_key:
            raise ValueError("api_key is required")

        headers = {"Authorization": f"Bearer {api_key}"}
        if user_agent:
            headers["User-Agent"] = user_agent

        self._http = httpx.Client(
            base_url=base_url.rstrip("/") + _PARTNER_PREFIX,
            headers=headers,
            timeout=timeout,
            follow_redirects=True,
        )
        # max_retries counts retries, not attempts: 0 still sends the request once.
        self._max_retries = max(1, max_retries)

    def __enter__(self) -> "GridBankAPIClient":
        return self

    def __exit__(self, *_exc: object) -> None:
        self.close()

    def close(self) -> None:
        self._http.close()

    # -- requests ---------------------------------------------------------

    def _get(self, path: str, params: Optional[dict] = None) -> Any:
        query = {k: v for k, v in (params or {}).items() if v is not None}

        for attempt in range(self._max_retries):
            try:
                response = self._http.get(path, params=query)
            except httpx.RequestError as exc:
                raise PartnerError(0, str(exc)) from exc

            if response.status_code == 429 and attempt < self._max_retries - 1:
                time.sleep(float(response.headers.get("Retry-After", 2**attempt)))
                continue

            if response.is_success:
                return response.json()

            raise self._error(response)

        raise PartnerError(429, "Rate limited, and retries are exhausted")

    @staticmethod
    def _error(response: httpx.Response) -> PartnerError:
        try:
            body = response.json()
        except ValueError:
            body = {}

        detail = body.get("detail", {}) if isinstance(body, dict) else {}
        message = detail.get("error", {}).get("message") if isinstance(detail, dict) else None
        message = message or (detail if isinstance(detail, str) else response.text)

        by_status = {401: NotAuthenticated, 403: NotLicensed, 404: VideoNotFound}
        return by_status.get(response.status_code, PartnerError)(
            response.status_code, message, body
        )

    # -- content ----------------------------------------------------------

    def content(self, *, per_page: int = _DEFAULT_PER_PAGE) -> Iterator[Video]:
        """Every video this account has licensed, newest purchase first.

        Pages are fetched as they are consumed, so a caller that stops early
        does not pay for the rest.
        """
        cursor: Optional[str] = None

        while True:
            page = self._get("/content", {"per_page": per_page, "cursor": cursor})

            for item in page.get("videos", []):
                yield _video(item)

            cursor = page.get("next_cursor")
            if not cursor:
                return

    def download_url(self, video_key: str) -> str:
        """A URL for the master file, valid for about five minutes.

        Prefer :meth:`download` unless you need the URL itself; it handles the
        expiry for you.
        """
        return self._get(f"/videos/{video_key}/download")["url"]

    def download(
        self,
        video_key: str,
        destination: Union[str, Path, IO[bytes]],
        *,
        chunk_size: int = 1024 * 1024,
    ) -> None:
        """Fetch a licensed video to a path or an open binary file.

        The signed URL expires quickly, and a slow queue between requesting one
        and using it is the normal way this fails. A rejected URL is therefore
        re-requested once rather than raising: the second failure is real.

        Raises:
            NotLicensed: this account has not licensed the video.
            VideoNotFound: no video with that key.
        """
        for attempt in range(2):
            url = self.download_url(video_key)
            try:
                self._stream_to(url, destination, chunk_size)
                return
            except httpx.HTTPStatusError as exc:
                expired = exc.response.status_code in (400, 403)
                if not expired or attempt == 1:
                    raise PartnerError(
                        exc.response.status_code,
                        f"Could not fetch the signed URL for {video_key}",
                    ) from exc
                # The URL went stale between issuing and using it; ask for another.
                if hasattr(destination, "seek"):
                    destination.seek(0)  # type: ignore[union-attr]
                    destination.truncate()  # type: ignore[union-attr]

    def _stream_to(
        self,
        url: str,
        destination: Union[str, Path, IO[bytes]],
        chunk_size: int,
    ) -> None:
        with httpx.stream("GET", url, timeout=None, follow_redirects=True) as response:
            response.raise_for_status()

            if hasattr(destination, "write"):
                for chunk in response.iter_bytes(chunk_size):
                    destination.write(chunk)  # type: ignore[union-attr]
                return

            path = Path(destination)  # type: ignore[arg-type]
            # Write beside the target, then move: an interrupted download must
            # not leave a truncated file that looks complete. The name is unique
            # per call so concurrent downloads of the same video cannot delete
            # each other's partial, and same-directory keeps the replace atomic.
            fd, name = tempfile.mkstemp(dir=path.parent, prefix=path.name + ".", suffix=".part")
            partial = Path(name)
            try:
                with os.fdopen(fd, "wb") as handle:
                    for chunk in response.iter_bytes(chunk_size):
                        handle.write(chunk)
                os.replace(partial, path)
            except BaseException:
                partial.unlink(missing_ok=True)
                raise


__all__ = [
    "Creator",
    "NotAuthenticated",
    "NotLicensed",
    "GridBankAPIClient",
    "PartnerError",
    "Video",
    "VideoNotFound",
]
