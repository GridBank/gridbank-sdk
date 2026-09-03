"""Client for the GridBank Partner API.

Reads and downloads the videos your account has licensed. Separate from
:class:`gridbank_api.EnterpriseClient`, which serves leased collections to
enterprise contracts: different credential, different contract.

Create a key from your account settings on gridbank.io.

    from gridbank_api import PartnerClient

    client = PartnerClient(api_key="apik_...")

    for video in client.content():
        client.download(video.id, f"{video.id}.mp4")

The raw API is three things away from comfortable, and this wraps exactly those:
paging is a cursor you have to thread through, a download URL expires after five
minutes, and an unlicensed video is a bare 403.
"""

from __future__ import annotations

import os
import shutil
import tempfile
import time
from pathlib import Path
from typing import IO, Any, Iterator, Optional, Union

import httpx

from ._models import Creator, Video

_BASE_URL = "https://api2.gridbank.io"
_PARTNER_PREFIX = "/partner/v1"
_DEFAULT_PER_PAGE = 50


class ContentError(Exception):
    """Any non-success response from the Partner API."""

    def __init__(self, status_code: int, message: str, details: Optional[Any] = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.details = details


class NotLicensed(ContentError):
    """The video exists on GridBank, but this account has not licensed it.

    Distinct from :class:`VideoNotFound` on purpose: this one is fixable by
    licensing the video, so it is worth catching separately from a bad key.
    """


class VideoNotFound(ContentError):
    """No video with that key."""


class NotAuthenticated(ContentError):
    """The API key is missing, malformed, or revoked."""


class AccessRevoked(ContentError):
    """GridBank has withdrawn this account's Partner API access.

    Nothing the client can do about it: the key is valid and the videos are
    licensed, but the account is blocked. Retrying will not help and neither
    will a new key, so this is worth catching separately from
    :class:`NotLicensed` - get in touch with GridBank instead.
    """


def _video(data: dict) -> Video:
    creator = data.get("creator") or {}
    return Video(
        id=data["video_key"],
        creator=Creator(
            id=creator.get("id", ""),
            username=creator.get("username") or "",
            name=creator.get("name"),
        ),
        title=data.get("title"),
        duration=data.get("duration_seconds"),
        url=data.get("preview_url"),
        thumbnail=data.get("thumbnail_url"),
        purchased_at=data.get("purchased_at"),
    )


class PartnerClient:
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
        # max_retries is a total attempt count, matching EnterpriseClient. Floored at
        # one so 0 disables retrying rather than sending nothing at all.
        self._max_retries = max(1, max_retries)

    def __enter__(self) -> "PartnerClient":
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
                raise ContentError(0, str(exc)) from exc

            if response.status_code == 429 and attempt < self._max_retries - 1:
                time.sleep(float(response.headers.get("Retry-After", 2**attempt)))
                continue

            if response.is_success:
                return response.json()

            raise self._error(response)

        raise ContentError(429, "Rate limited, and retries are exhausted")

    @staticmethod
    def _error(response: httpx.Response) -> ContentError:
        try:
            body = response.json()
        except ValueError:
            body = {}

        detail = body.get("detail", {}) if isinstance(body, dict) else {}
        error = detail.get("error", {}) if isinstance(detail, dict) else {}
        message = error.get("message") if isinstance(error, dict) else None
        message = message or (detail if isinstance(detail, str) else response.text)

        by_status = {401: NotAuthenticated, 403: NotLicensed, 404: VideoNotFound}
        kind = by_status.get(response.status_code, ContentError)

        # The API sends two different 403s. Only the code tells them apart, and
        # reading the status alone reports a blocked account as a licensing
        # problem the caller could fix by buying the video.
        if isinstance(error, dict) and error.get("code") == "partner_access_revoked":
            return AccessRevoked(response.status_code, message, body)

        # A 403 from the edge is a bare {"message": "Forbidden"} with no error
        # envelope, and has nothing to do with licensing. Only the API's own 403
        # means the caller has not licensed the video.
        if kind is NotLicensed and not (isinstance(detail, dict) and detail.get("error")):
            kind = ContentError

        return kind(response.status_code, message, body)

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
            AccessRevoked: GridBank has blocked this account's API access.
        """
        for attempt in range(2):
            url = self.download_url(video_key)
            try:
                self._stream_to(url, destination, chunk_size)
                return
            except httpx.HTTPStatusError as exc:
                expired = exc.response.status_code in (400, 403)
                if not expired or attempt == 1:
                    raise ContentError(
                        exc.response.status_code,
                        f"Could not fetch the signed URL for {video_key}",
                    ) from exc
                # The URL went stale between issuing and using it; ask for another.
                # Nothing has been written: _stream_to raises for status before the
                # first chunk, so there is no partial write to undo. Resetting a
                # caller-supplied handle here would erase content we never wrote.

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
    "PartnerClient",
    "NotAuthenticated",
    "NotLicensed",
    "ContentError",
    "VideoNotFound",
]
