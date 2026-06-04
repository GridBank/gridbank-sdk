# Python SDK Documentation

Welcome to the GridBank Python SDK documentation. This guide will help you integrate GridBank's video search and download API into your Python application.

## Getting Started

1. **[Installation](installation.md)** — Install the SDK with pip
2. **[Client Setup](client.md)** — Initialize your first client
3. **[Quick Example](overview.md#quick-example)** — See a working example

## Learn by Doing

- **[Code Examples](examples.md)** — Real-world usage patterns and workflows
- **[Method Reference](methods.md)** — Complete API method documentation

## Reference

- **[API Reference](../api-reference.md)** — Full REST API specification
- **[Error Handling](../api-reference.md#error-codes)** — Learn error codes and how to handle them
- **[Rate Limiting](../api-reference.md#rate-limiting)** — Understand rate limit behavior

## Key Concepts

### Authentication

All requests require a Bearer token API key.

```python
from gridbank_api import GridbankClient

client = GridbankClient(api_key="apik_your_key_here")
```

### Core Methods

The SDK provides 4 core methods:

- **`search_videos()`** — Search the video library with full-text search
- **`get_video()`** — Fetch detailed metadata for a video
- **`download_video()`** — Generate signed download URLs
- **`usage_summary()`** — Check your subscription tier and quota

### Error Handling

All methods raise `GridbankAPIError` on failures:

```python
from gridbank_api import GridbankAPIError

try:
    results = client.search_videos(q="nature")
except GridbankAPIError as e:
    print(f"Error: {e.code} - {e.message}")
```

## Common Tasks

**Search for videos:**
```python
results = client.search_videos(q="skincare", per_page=10)
```

**Get video details:**
```python
video = client.get_video(video_id="video_abc123")
print(f"{video.title} by {video.creator.name}")
```

**Download a video:**
```python
download = client.download_video(video_id="video_abc123")
print(f"Download URL: {download.url}")
```

**Check your usage:**
```python
usage = client.usage_summary()
print(f"Tier: {usage.tier}")
print(f"Downloads used: {usage.downloads_this_period}")
```

## Troubleshooting

**Installation issues?** See [Installation Troubleshooting](installation.md#troubleshooting)

**Error with API key?** See [Error Codes](../api-reference.md#error-codes)

**Rate limited?** See [Rate Limiting](../api-reference.md#rate-limiting)

## Need Help?

- Email: hello@gridbank.io
- [API Status](https://gridbank.io)
- [Full API Reference](../api-reference.md)
