# gridbank-api

Official Python SDK for the GridBank API.

**Docs:** https://docs.gridbank.io/python.html

## Install

```bash
pip install gridbank-api
```

Requires Python 3.9+. Uses `httpx` for HTTP.

## Which client

The package ships two clients for two separate products. Neither is built on the other, and
neither is the "main" one — they serve different audiences with different credentials. Both
import from `gridbank_api`.

| Client | Product | Serves | Credential |
|--------|---------|--------|------------|
| `PartnerClient` | Partner API | catalog search, and the videos **your own account has licensed** | member API key |
| `EnterpriseClient` | Enterprise API (B2B) | leased collections on an **enterprise contract** | customer API key |

Searching the catalog or reaching your own library from your own tools → `PartnerClient`.
On an enterprise contract, searching leased collections → `EnterpriseClient`.

---

## `PartnerClient` — catalog search and your licensed library

```python
from gridbank_api import PartnerClient, NotLicensed

client = PartnerClient(api_key="apik_...", user_agent="your-app/1.0")

# Pages are fetched as you consume them, so stopping early costs nothing.
for video in client.content():
    print(video.id, video.title)

# Handles the five-minute signed-URL expiry, and streams to disk.
try:
    client.download("video_019b12...", "clip.mov")
except NotLicensed:
    print("not licensed by this account")
```

`download()` writes to a temporary file and moves it into place, so an interrupted
transfer never leaves a truncated file that looks complete. It accepts a path or any
open binary file.

### Search

```python
for video in client.search(
    "aerial coastline",
    location="Lisbon, Lisboa, PRT",
    sort="popular",  # "relevant", "popular" or "recent"
    duration_gte=4,  # seconds, 4-30
    duration_lte=15,
):
    print(video.id, video.url, video.width, video.height)
```

Searches the whole catalog with the same search and ranking as gridbank.io, limited to
clips of 4 to 30 seconds, including videos this account has not licensed. Hits are watermarked previews: downloading one you
have not licensed raises `NotLicensed`. Leave a filter out to get the server default.

`location` is comma-separated, and a video must match every part. A 2- or 3-letter ISO
country code matches the video's country (`"PRT"`, not `"Portugal"`); any other part must
equal the city or region, ignoring case, or appear in the location description.

Pages are fetched lazily until `has_more` is false. A page can hold fewer than `per_page`
(1-50, default 50) videos without being the last, and paging ends at page 199.

### Search creators

```python
for result in client.search_creators("jdoe", top_only=True):
    print(result.creator.username, result.clips_count, [v.id for v in result.videos])
```

An empty query lists every creator. `location`, `top_only`, `featured_only` and
`favorites_only` (creators this account has favourited on gridbank.io) narrow the listing.
Each result carries a selection of the creator's videos as watermarked previews. Pages are
fetched lazily until `has_more` is false, up to page 20.

### Options

```python
client = PartnerClient(
    api_key="apik_...",
    user_agent="your-app/1.0",  # identify your app; unidentified traffic can be blocked
    timeout=30.0,
    max_retries=3,  # total attempts on 429, honours Retry-After (1 or 0 disables retrying)
    # The API allows 300 requests per minute per account, across all its keys.
)
```

### Errors

All inherit from `ContentError`, which carries `status_code`, `message`, and `details`.

| Exception | Meaning |
|-----------|---------|
| `NotLicensed` | the video exists, but this account has not licensed it |
| `VideoNotFound` | no video with that key |
| `NotAuthenticated` | the API key is missing, malformed, or revoked |
| `AccessRevoked` | GridBank has withdrawn this account's Partner API access |
| `PartnerApiNotIncluded` | this account's plan does not include the Partner API |

---

## `EnterpriseClient` — enterprise collections

> Renamed in 0.3.0. `GridbankClient` and `GridbankAPIError` still work as aliases and
> warn on use; they are removed in 1.0.

```python
from gridbank_api import EnterpriseClient, EnterpriseAPIError

client = EnterpriseClient(api_key="apik_...")

results = client.search_videos(q="nature", per_page=10)
for video in results.videos:
    print(video.title)
```

### Options

```python
client = EnterpriseClient(
    api_key="apik_...",
    max_retries=3,  # retries on 429, honours Retry-After header (default: 3, set 0 to disable)
)
```

### Errors

```python
try:
    results = client.search_videos(q="nature")
except EnterpriseAPIError as e:
    print(f"Error {e.code}: {e.message}")
```
