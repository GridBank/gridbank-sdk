# Python SDK Client Setup

Initialize and configure the GridBank API client for your Python application.

## Basic Initialization

Create a client with just your API key:

```python
from gridbank_api import GridbankClient

client = GridbankClient(api_key="apik_your_key_here")
```

**Get your API key:** Contact [hello@gridbank.io](mailto:hello@gridbank.io) — keys are provisioned manually during onboarding.

## Configuration Options

Customize client behavior with advanced options:

```python
client = GridbankClient(
    api_key="apik_your_key_here",
    base_url="https://api2.gridbank.io",  # Default API endpoint
)
```

## Secure API Key Management (Recommended)

Never hardcode API keys. Store them in environment variables:

```bash
# .env file or export in terminal
export GRIDBANK_API_KEY="apik_your_key_here"
```

Load from environment:

```python
import os
from gridbank_api import GridbankClient

api_key = os.getenv("GRIDBANK_API_KEY")
if not api_key:
    raise ValueError("GRIDBANK_API_KEY environment variable not set")

client = GridbankClient(api_key=api_key)
```

## Error Handling

All SDK methods raise `GridbankAPIError` on API errors. Handle them gracefully:

```python
from gridbank_api import GridbankClient, GridbankAPIError

client = GridbankClient(api_key="apik_...")

try:
    results = client.search_videos(q="test")
except GridbankAPIError as e:
    print(f"HTTP {e.status_code}: {e.message}")
    if e.details:
        print(f"Details: {e.details}")
```

See [Error Handling Guide](../api-reference.md#error-codes) for detailed error information.

## Type Hints & IDE Support

The SDK provides full type hints for excellent IDE autocomplete:

```python
from gridbank_api import GridbankClient, VideoListResponse, Video

client = GridbankClient(api_key="apik_...")

# Full type support
results: VideoListResponse = client.search_videos(q="nature", per_page=5)

# IDE knows about all Video properties
for video in results.videos:
    print(f"{video.title} by {video.creator.name}")
```

## Next Steps

- [Method Reference](methods.md) — Complete method documentation
- [Code Examples](examples.md) — Real-world usage patterns
- [Error Handling](../api-reference.md#error-codes) — Learn error codes
