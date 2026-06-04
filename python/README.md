# gridbank-api

Official Python SDK for the GridBank API.

**Docs:** https://gridbank.github.io/gridbank-sdk/python.html

## Install

```bash
pip install gridbank-api
```

## Usage

```python
from gridbank_api import GridbankClient, GridbankAPIError

client = GridbankClient(api_key="apik_...")

results = client.search_videos(q="nature", per_page=10)
for video in results.videos:
    print(video.title)
```
