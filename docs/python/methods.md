# Python SDK Methods

All GridBank API methods are available through the `GridbankClient` instance. Methods use Python naming conventions (snake_case) and return type-safe Pydantic models.

## search_videos()

Query the GridBank video library with full-text search. Supports filtering by duration and category, with multiple sort options for relevance, popularity, and recency.

```python
result = client.search_videos(
    q="skincare morning routine",
    sort="relevant",
    page=1,
    per_page=15,
    duration_min=None,
    duration_max=None,
    theme=None
)
```

**Parameters:**

- `q` (str, required): Search query (1–200 characters)
- `sort` (str, default `"relevant"`): Sort by `"relevant"`, `"popular"`, or `"recent"`
- `page` (int, default 1): Page number for pagination
- `per_page` (int, default 15): Results per page (1–80)
- `duration_min` (int | None): Minimum duration in seconds
- `duration_max` (int | None): Maximum duration in seconds
- `theme` (str | None): Content category filter

**Returns:**

```python
class SearchResult:
    videos: list[Video]        # Array of matching videos
    has_more: bool             # True if more pages exist
    search_id: str             # Unique search session ID
```

**Errors:** 400, 401, 422, 429, 500

**Example:**

```python
result = client.search_videos(q="nature", sort="relevant", page=1, per_page=15)
print(f"Found {len(result.videos)} videos")
for video in result.videos:
    print(f"  {video.id}: {video.title}")
```

---

## get_video()

Fetch complete metadata for a single video by ID, including creator details, dimensions, and licensing information. **Requires active subscription.**

```python
video = client.get_video(video_id="video_abc123")
```

**Parameters:**

- `video_id` (str, required): Video identifier

**Returns:**

```python
class Video:
    id: str                        # Video ID
    title: str                     # Title
    description: str               # Long-form description
    duration: float                # Duration in seconds
    width: int                     # Width in pixels
    height: int                    # Height in pixels
    url: str                       # Preview URL
    thumbnail: str                 # Thumbnail URL
    creator: Creator               # Creator metadata
    location: Location             # Location metadata
    content_tier: str              # Licensing tier
    created_at: datetime           # Upload timestamp
    is_featured: bool              # Featured flag
    keywords: list[str]            # Associated keywords
```

**Errors:** 401, 403, 404, 429, 500

**Example:**

```python
video = client.get_video(video_id="video_abc123")
print(f"{video.title} ({video.duration}s)")
print(f"By {video.creator.name}")
print(f"Keywords: {', '.join(video.keywords)}")
```

---

## download_video()

Generate a time-limited, signed download URL for the original video file. Perfect for integrating video downloads into your application. **Requires active subscription.**

```python
download = client.download_video(
    video_id="video_abc123",
    expires_in=5,
    search_id=None
)
```

**Parameters:**

- `video_id` (str, required): Video identifier
- `expires_in` (int, default 5): URL expiration in minutes (1–5)
- `search_id` (str | None): Search session ID for analytics

**Returns:**

```python
class Download:
    url: str                   # Signed S3 download URL
    expires_at: datetime       # Expiration timestamp
```

**Errors:** 401, 403, 404, 429, 500

**Example:**

```python
download = client.download_video(
    video_id="video_abc123",
    expires_in=5,
    search_id=results.search_id
)
print(f"Download expires at: {download.expires_at}")
print(f"URL: {download.url}")
```

---

## usage_summary()

Check your account's current subscription tier, download quota, and billing period. Use this to monitor your usage and determine when to upgrade your plan.

```python
usage = client.usage_summary()
```

**Parameters:** None

**Returns:**

```python
class Usage:
    downloads_this_period: int     # Downloads used this billing period
    tier: str                      # Subscription tier
    lease_period_end: datetime     # Period end timestamp
```

**Errors:** 401, 429, 500

**Example:**

```python
usage = client.usage_summary()
print(f"Tier: {usage.tier}")
print(f"Downloads this period: {usage.downloads_this_period}")
print(f"Period ends: {usage.lease_period_end}")
```

---

## Exception Handling

All methods raise `GridbankAPIError` on errors:

```python
from gridbank_api import GridbankAPIError

try:
    video = client.get_video(video_id="invalid")
except GridbankAPIError as e:
    print(f"Code: {e.code}")           # "not_found"
    print(f"Message: {e.message}")     # "Video not found"
    print(f"HTTP Status: {e.status_code}")  # 404
    if e.details:
        print(f"Details: {e.details}")
```

---

## Next Step

See [end-to-end examples](examples.md).
