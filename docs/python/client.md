# Python SDK Client

## Initializing the Client

```python
from gridbank_api import GridbankClient

client = GridbankClient(api_key="apik_your_key_here")
```

The `api_key` is required. Get your key from the [GridBank dashboard](https://gridbank.io/dashboard).

## Configuration Options

```python
client = GridbankClient(
    api_key="apik_your_key_here",
    base_url="https://api.gridbank.io",  # Default
    timeout=30,                            # Default timeout in seconds
    max_retries=3,                         # Retries for 429 rate limits
)
```

## Using Environment Variables

For security, store your API key in an environment variable:

```bash
export GRIDBANK_API_KEY="apik_your_key_here"
```

Then load it in your code:

```python
import os
from gridbank_api import GridbankClient

api_key = os.getenv("GRIDBANK_API_KEY")
client = GridbankClient(api_key=api_key)
```

## Error Handling

All methods raise `GridbankAPIError` on non-2xx responses:

```python
from gridbank_api import GridbankClient, GridbankAPIError

client = GridbankClient(api_key="apik_...")

try:
    results = client.search_videos(q="test")
except GridbankAPIError as e:
    print(f"Error {e.code}: {e.message}")
    print(f"HTTP Status: {e.status_code}")
    if e.details:
        print(f"Details: {e.details}")
```

## Type Hints

The SDK includes full type hints:

```python
from gridbank_api import GridbankClient, SearchResult

client = GridbankClient(api_key="apik_...")

# IDE autocomplete works here
results: SearchResult = client.search_videos(q="nature", per_page=5)

# videos is a list of Video objects
for video in results.videos:
    print(video.title)  # IDE knows about Video properties
```

## Next Step

Explore all available [methods](methods.md).
