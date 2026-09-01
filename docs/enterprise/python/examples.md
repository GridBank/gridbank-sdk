# Python SDK Examples

## First Call: Search and Download

Initialize a client and search for videos, then download one.

```python
from gridbank_api import GridbankClient, GridbankAPIError

# Initialize client
client = GridbankClient(api_key="apik_your_key_here")

try:
    # Search for videos
    results = client.search_videos(
        q="morning skincare routine",
        sort="relevant",
        per_page=5
    )
    
    print(f"Found {len(results.videos)} videos (search_id: {results.search_id})")
    
    # Get the first result
    if results.videos:
        video = results.videos[0]
        print(f"\nTop result: {video.title}")
        print(f"Duration: {video.duration}s | Creator: {video.creator.name}")
        
        # Download the video
        download = client.download_video(
            video_id=video.id,
            expires_in=5,
            search_id=results.search_id  # track funnel
        )
        
        print(f"\nDownload URL: {download.url}")
        print(f"Expires: {download.expires_at}")
        
        # Check usage
        usage = client.usage_summary()
        print(f"\nUsage: {usage.downloads_this_period} downloads used")
        print(f"Tier: {usage.tier}")

except GridbankAPIError as e:
    print(f"HTTP {e.status_code}: {e.message}")
    if e.details:
        print(f"Details: {e.details}")
except Exception as e:
    print(f"Error: {e}")
```

## Search with Filters

Search for videos with specific duration and theme:

```python
# Find short nature documentaries
results = client.search_videos(
    q="nature documentary",
    duration_min=60,      # At least 1 minute
    duration_max=300,     # At most 5 minutes
    theme="nature",
    sort="popular",
    per_page=10
)

print(f"Found {len(results.videos)} short nature videos")
```

## Fetch Video Details

Get full metadata for a video:

```python
video = client.get_video(video_id="video_abc123")

print(f"Title: {video.title}")
print(f"Creator: {video.creator.name} (@{video.creator.username})")
if video.location:
    print(f"Location: {video.location.city}, {video.location.region}")
print(f"Duration: {video.duration}s")
print(f"Resolution: {video.width}x{video.height}")
if video.keywords:
    print(f"Keywords: {', '.join(video.keywords)}")
```

## Batch Download Videos

Download multiple videos:

```python
results = client.search_videos(q="nature", per_page=20)

for video in results.videos:
    try:
        download = client.download_video(
            video_id=video.id,
            expires_in=5,
            search_id=results.search_id
        )
        print(f"✓ {video.title} -> {download.url}")
    except GridbankAPIError as e:
        print(f"✗ {video.title} failed: {e.message}")
```

## Check Quota Before Downloading

Verify you have remaining quota before large downloads:

```python
usage = client.usage_summary()
print(f"Tier: {usage.tier}")
print(f"Downloads used: {usage.downloads_this_period}")
print(f"Period ends: {usage.lease_period_end}")

print(f"Period ends: {usage.lease_period_end}")
```

## Pagination Example

Iterate through all search results **sequentially** (page 1 → 2 → 3, etc.) for consistent results:

```python
page = 1
all_videos = []

while True:
    results = client.search_videos(
        q="nature",
        page=page,
        per_page=50
    )
    
    all_videos.extend(results.videos)
    print(f"Fetched {len(results.videos)} videos from page {page}")
    
    # Always check has_more before requesting next page
    if not results.has_more:
        break
    
    # Move to next page sequentially
    page += 1

print(f"Total videos collected: {len(all_videos)}")
```

**Important:** Always iterate sequentially from page 1. Jumping to arbitrary pages may return inconsistent results.

## Error Handling Best Practices

```python
from gridbank_api import GridbankClient, GridbankAPIError

client = GridbankClient(api_key="apik_...")

try:
    video = client.get_video(video_id="video_xyz")
    
except GridbankAPIError as e:
    # Handle by HTTP status code
    if e.status_code == 401:
        print("API key is invalid. Check your credentials.")
    elif e.status_code == 403:
        print("You don't have access. Upgrade your subscription.")
    elif e.status_code == 404:
        print("Video not found. Try searching first.")
    elif e.status_code == 429:
        print("Too many requests. Wait before retrying.")
    elif e.status_code == 422:
        for error in (e.details or []):
            print(f"Field {error['loc']}: {error['msg']}")
    else:
        print(f"HTTP {e.status_code}: {e.message}")
        
except Exception as e:
    # Handle unexpected errors
    print(f"Unexpected error: {e}")
```

## Environment Setup

Store credentials securely:

```bash
# .env file
GRIDBANK_API_KEY=apik_your_key_here
```

```python
import os
from gridbank_api import GridbankClient

api_key = os.getenv("GRIDBANK_API_KEY")
if not api_key:
    raise ValueError("GRIDBANK_API_KEY environment variable not set")

client = GridbankClient(api_key=api_key)
```

---

For more details, see:
- [Client Setup](client.md)
- [Method Reference](methods.md)
- [Error Handling](../errors.md)
