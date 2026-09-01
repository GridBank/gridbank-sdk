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
| `PartnerClient` | Partner API | the videos **your own account has licensed** | member API key |
| `EnterpriseClient` | Enterprise API (B2B) | leased collections on an **enterprise contract** | customer API key |

Reaching your own library from your own tools → `PartnerClient`.
On an enterprise contract, searching leased collections → `EnterpriseClient`.

---

## `PartnerClient` — your licensed library

```python
from gridbank_api import PartnerClient, NotLicensed

client = PartnerClient(api_key="apik_...", user_agent="your-app/1.0")

# Pages are fetched as you consume them, so stopping early costs nothing.
for video in client.content():
    print(video.id, video.title)

# Handles the five-minute signed-URL expiry, and streams to disk.
try:
    client.download("video_019b12...", "clip.mp4")
except NotLicensed:
    print("not licensed by this account")
```

`download()` writes to a temporary file and moves it into place, so an interrupted
transfer never leaves a truncated file that looks complete. It accepts a path or any
open binary file.

### Options

```python
client = PartnerClient(
    api_key="apik_...",
    user_agent="your-app/1.0",  # identify your app; unidentified traffic can be blocked
    timeout=30.0,
    max_retries=3,  # total attempts on 429, honours Retry-After (1 or 0 disables retrying)
    # The API allows 600 requests per minute per key.
)
```

### Errors

All inherit from `ContentError`, which carries `status_code`, `message`, and `details`.

| Exception | Meaning |
|-----------|---------|
| `NotLicensed` | the video exists, but this account has not licensed it |
| `VideoNotFound` | no video with that key |
| `NotAuthenticated` | the API key is missing, malformed, or revoked |

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
