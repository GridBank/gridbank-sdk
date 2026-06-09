# gridbank-api

Official Python SDK for the GridBank API.

**Docs:** https://docs.gridbank.io/python.html

## Install

```bash
pip install gridbank-api
```

Requires Python 3.9+. Uses `httpx` for HTTP.

## Usage

```python
from gridbank_api import GridbankClient, GridbankAPIError

client = GridbankClient(api_key="apik_...")

results = client.search_videos(q="nature", per_page=10)
for video in results.videos:
    print(video.title)
```

## Options

```python
client = GridbankClient(
    api_key="apik_...",
    max_retries=3,  # retries on 429, honours Retry-After header (default: 3, set 0 to disable)
)
```

## Error Handling

```python
try:
    results = client.search_videos(q="nature")
except GridbankAPIError as e:
    print(f"Error {e.code}: {e.message}")
```
