---
title: Python SDK
---

# Python SDK Reference

[← Back to overview](index.html)

**Install:** `pip install gridbank-api`  
**Requires:** Python 3.9+

---

## GridbankClient

```python
from gridbank_api import GridbankClient

client = GridbankClient(api_key="apik_...")
```

### `search_videos`

```python
def search_videos(
    self,
    q: str,
    sort: str = "relevant",
    page: int = 1,
    per_page: int = 15,
    duration_min: int | None = None,
    duration_max: int | None = None,
    theme: str | None = None,
) -> SearchResult
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | `str` | required | Search query (1–200 chars) |
| `sort` | `str` | `"relevant"` | `"relevant"` · `"popular"` · `"recent"` |
| `page` | `int` | `1` | Page number — navigate sequentially |
| `per_page` | `int` | `15` | Results per page (1–80) |
| `duration_min` | `int \| None` | `None` | Min duration in seconds |
| `duration_max` | `int \| None` | `None` | Max duration in seconds |
| `theme` | `str \| None` | `None` | Content category filter |

**Returns** `SearchResult`:
- `videos: list[Video]`
- `has_more: bool`
- `search_id: str` — pass to `download_video` for funnel tracking

---

### `get_video`

```python
def get_video(self, video_id: str) -> Video
```

Requires active subscription. Returns full `Video` metadata including creator, location, and watermarked preview URL.

---

### `download_video`

```python
def download_video(
    self,
    video_id: str,
    expires_in: int = 5,
    search_id: str | None = None,
) -> DownloadResult
```

Requires active subscription. Returns a signed S3 URL valid for `expires_in` minutes (1–5).

**Returns** `DownloadResult`:
- `url: str` — signed S3 download URL
- `expires_at: datetime`

---

### `usage_summary`

```python
def usage_summary(self) -> UsageSummary
```

**Returns** `UsageSummary`:
- `downloads_this_period: int`
- `tier: str` — `"starter"` · `"pro"` · `"enterprise"`
- `lease_period_end: datetime`

---

## Data Models

### `Video`
| Field | Type |
|-------|------|
| `id` | `str` |
| `title` | `str` |
| `description` | `str` |
| `duration` | `float` |
| `width` | `int` |
| `height` | `int` |
| `url` | `str` — watermarked preview |
| `thumbnail` | `str` — watermarked thumbnail |
| `creator` | `Creator` |
| `location` | `Location` |
| `content_tier` | `str` |
| `created_at` | `datetime` |
| `is_featured` | `bool` |
| `keywords` | `list[str]` |

### `Creator`
`id · name · username · bio · profile_image`

### `Location`
`city · region · country`

---

## First Call Example

```python
from gridbank_api import GridbankClient, GridbankAPIError

client = GridbankClient(api_key="apik_your_key_here")

try:
    # Search
    results = client.search_videos(q="morning skincare routine", sort="relevant", per_page=5)
    print(f"Found {len(results.videos)} videos (search_id: {results.search_id})")

    if results.videos:
        video = results.videos[0]
        print(f"Top result: {video.title} ({video.duration}s) by {video.creator.name}")

        # Download
        download = client.download_video(
            video_id=video.id,
            expires_in=5,
            search_id=results.search_id,
        )
        print(f"Download URL: {download.url}")
        print(f"Expires: {download.expires_at}")

        # Usage
        usage = client.usage_summary()
        print(f"Tier: {usage.tier} | Downloads used: {usage.downloads_this_period}")

except GridbankAPIError as e:
    print(f"API Error {e.code}: {e.message}")
```

## Pagination

Always paginate sequentially — arbitrary page jumps may return inconsistent results.

```python
page = 1
while True:
    results = client.search_videos(q="nature", page=page, per_page=50)
    for video in results.videos:
        process(video)
    if not results.has_more:
        break
    page += 1
```

## Rate Limits

On `429`, back off and retry. Check the `Retry-After` response header.

```python
import time

try:
    result = client.search_videos(q="test")
except GridbankAPIError as e:
    if e.code == "rate_limited":
        time.sleep(60)
        result = client.search_videos(q="test")
```
