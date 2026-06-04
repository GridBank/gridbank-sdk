# Python SDK

The official GridBank Python SDK provides a type-safe, Pythonic wrapper around the REST API. Build video search, metadata retrieval, and download features with just a few lines of code.

## Why Use the SDK?

- **Type hints** — Full type annotations for IDE autocomplete and better development experience
- **Error handling** — Automatic exception raising with detailed error messages and status codes
- **Pydantic models** — Strongly-typed request/response objects with validation
- **Retry logic** — Built-in exponential backoff for handling rate limits gracefully
- **Zero friction** — No manual header management, authentication, or JSON parsing

## Installation

```bash
pip install gridbank-api
```

**Requires:** Python 3.8+

## Quick Example

```python
from gridbank_api import GridbankClient

# Initialize the client with your API key
client = GridbankClient(api_key="apik_...")

# Search for videos
results = client.search_videos(q="nature", per_page=5)

# Display results
for video in results.videos:
    print(f"{video.title} ({video.duration}s)")
    print(f"  Creator: {video.creator.name}")
```

## What's Included

- **GridbankClient** — Main API client with 4 core methods
- **search_videos()** — Full-text video search with pagination
- **get_video()** — Fetch complete video metadata (requires subscription)
- **download_video()** — Generate signed download URLs (requires subscription)
- **usage_summary()** — Check your account tier and download quota
- **GridbankAPIError** — Exception class for comprehensive error handling
- **Type models** — Pydantic models for all request/response shapes

## Authentication

All requests require a Bearer token. [Get your API key →](../api-reference.md#authentication)

```python
client = GridbankClient(api_key="apik_your_key_here")
```

## Next Steps

- [Installation Guide](installation.md) — Detailed setup instructions
- [Client Setup](client.md) — Initialize and configure the client
- [Method Reference](methods.md) — Complete API method documentation
- [Code Examples](examples.md) — Real-world usage patterns
- [API Reference](../api-reference.md) — Full REST API specification
- [Error Handling](../api-reference.md#error-codes) — Handle errors gracefully
