# gridbank-api

Official Python SDK for the GridBank API.

**Docs:** https://docs.gridbank.io/python.html

## Install

```bash
pip install gridbank-api
```

Requires Python 3.9+. Uses `httpx` for HTTP.

## Which client

The package ships two, for two different products. Both import from `gridbank_api`.

| Client | Serves | Credential |
|--------|--------|------------|
| `GridBankAPIClient` | the videos **your own account has licensed** | member API key |
| `GridbankClient` | leased collections on an **enterprise contract** | customer API key |

If you are a partner reaching your own library from your own tools, you want `GridBankAPIClient`.

---

## `GridBankAPIClient` — your licensed library

```python
from gridbank_api import GridBankAPIClient, NotLicensed

client = GridBankAPIClient(api_key="apik_...", user_agent="your-app/1.0")

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
client = GridBankAPIClient(
    api_key="apik_...",
    user_agent="your-app/1.0",  # identify your app; unidentified traffic can be blocked
    timeout=30.0,
    max_retries=3,  # retries on 429, honours Retry-After (0 disables retrying, still sends the request)
)
```

### Errors

All inherit from `PartnerError`, which carries `status_code`, `message`, and `details`.

| Exception | Meaning |
|-----------|---------|
| `NotLicensed` | the video exists, but this account has not licensed it |
| `VideoNotFound` | no video with that key |
| `NotAuthenticated` | the API key is missing, malformed, or revoked |

---

## `GridbankClient` — enterprise collections

```python
from gridbank_api import GridbankClient, GridbankAPIError

client = GridbankClient(api_key="apik_...")

results = client.search_videos(q="nature", per_page=10)
for video in results.videos:
    print(video.title)
```

### Options

```python
client = GridbankClient(
    api_key="apik_...",
    max_retries=3,  # retries on 429, honours Retry-After header (default: 3, set 0 to disable)
)
```

### Errors

```python
try:
    results = client.search_videos(q="nature")
except GridbankAPIError as e:
    print(f"Error {e.code}: {e.message}")
```
