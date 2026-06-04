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
    print(f"API Error {e.code}: {e.message}")
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
print(f"Location: {video.location.city}, {video.location.region}")
print(f"Duration: {video.duration}s")
print(f"Resolution: {video.width}x{video.height}")
print(f"Tier: {video.content_tier}")
print(f"Featured: {video.is_featured}")
print(f"Keywords: {', '.join(video.keywords)}")
print(f"Uploaded: {video.created_at}")
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

## Handle Rate Limiting

Implement retry logic for rate-limited requests:

```python
import time
from gridbank_api import GridbankAPIError

max_retries = 3
for attempt in range(max_retries):
    try:
        results = client.search_videos(q="nature", per_page=50)
        break
    except GridbankAPIError as e:
        if e.code == "rate_limited" and attempt < max_retries - 1:
            wait_time = 2 ** attempt  # exponential backoff: 1s, 2s, 4s
            print(f"Rate limited. Waiting {wait_time}s before retry...")
            time.sleep(wait_time)
        else:
            raise
```

## Check Quota Before Downloading

Verify you have remaining quota before large downloads:

```python
usage = client.usage_summary()
print(f"Tier: {usage.tier}")
print(f"Downloads used: {usage.downloads_this_period}")
print(f"Period ends: {usage.lease_period_end}")

# Tier limits (example)
tier_limits = {
    "starter": 100,
    "pro": 1000,
    "enterprise": float('inf')
}

limit = tier_limits.get(usage.tier, 0)
remaining = limit - usage.downloads_this_period

print(f"Remaining quota: {remaining}")

if remaining < 10:
    print("⚠️ Running low on quota. Upgrade or wait for period reset.")
```

## Pagination Example

Iterate through all search results:

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
    
    if not results.has_more:
        break
    
    page += 1

print(f"Total videos collected: {len(all_videos)}")
```

## Error Handling Best Practices

```python
from gridbank_api import GridbankClient, GridbankAPIError

client = GridbankClient(api_key="apik_...")

try:
    video = client.get_video(video_id="video_xyz")
    
except GridbankAPIError as e:
    # Handle specific API errors
    if e.code == "unauthorized":
        print("API key is invalid. Check your credentials.")
    elif e.code == "forbidden":
        print("You don't have access. Upgrade your subscription.")
    elif e.code == "not_found":
        print("Video not found. Try searching first.")
    elif e.code == "rate_limited":
        print("Too many requests. Wait before retrying.")
    elif e.code == "validation_error":
        for error in e.details:
            print(f"Field {error['loc']}: {error['msg']}")
    else:
        print(f"API Error: {e.message}")
        
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
- [Rate Limits](../advanced/rate-limits.md)
