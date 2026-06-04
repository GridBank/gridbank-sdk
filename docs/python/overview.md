# Python SDK

The official GridBank Python SDK provides a type-safe, Pythonic wrapper around the REST API. It handles authentication, error handling, and serialization automatically.

## Why Use the SDK?

- **Type hints** — Full type annotations for IDE autocomplete
- **Error handling** — Automatic exception raising for non-2xx responses
- **Pydantic models** — Strongly-typed request/response objects
- **Retry logic** — Built-in exponential backoff for rate limits
- **Convenience** — No manual header management or JSON parsing

## Installation

```bash
pip install gridbank-api
```

Requires Python 3.8+

## Quick Example

```python
from gridbank_api import GridbankClient

client = GridbankClient(api_key="apik_...")
results = client.search_videos(q="nature", per_page=5)

for video in results.videos:
    print(f"{video.title} ({video.duration}s)")
```

## What's Included

- `GridbankClient` — Main API client class
- 5 methods — `search_videos()`, `get_video()`, `download_video()`, `usage_summary()`, `health()`
- Exception classes — `GridbankAPIError` for error handling
- Type models — Pydantic models for all request/response shapes

## Next Steps

- [Installation Guide](installation.md)
- [Client Setup](client.md)
- [Method Reference](methods.md)
- [Examples](examples.md)
