# JavaScript SDK Examples

## First Call: Search and Download

Initialize a client and search for videos, then download one.

```javascript
import { GridbankClient, GridbankAPIError } from '@gridbank/api-js';

// Initialize client
const client = new GridbankClient({ apiKey: 'apik_your_key_here' });

try {
  // Search for videos
  const results = await client.searchVideos({
    q: 'morning skincare routine',
    sort: 'relevant',
    per_page: 5
  });
  
  console.log(`Found ${results.videos.length} videos (search_id: ${results.search_id})`);
  
  // Get the first result
  if (results.videos.length > 0) {
    const video = results.videos[0];
    console.log(`\nTop result: ${video.title}`);
    console.log(`Duration: ${video.duration}s | Creator: ${video.creator.username}`);
    
    // Download the video
    const download = await client.downloadVideo(video.id, {
      expires_in: 5,
      search_id: results.search_id  // track funnel
    });
    
    console.log(`\nDownload URL: ${download.url}`);
    console.log(`Expires: ${download.expires_at}`);
    
    // Check usage
    const usage = await client.usageSummary();
    console.log(`\nUsage: ${usage.downloads_this_period} downloads used`);
    console.log(`Tier: ${usage.tier}`);
  }
  
} catch (error) {
  if (error instanceof GridbankAPIError) {
    console.error(`HTTP ${error.statusCode}: ${error.message}`);
    if (error.details) {
      console.error(`Details:`, error.details);
    }
  } else {
    console.error('Error:', error);
  }
}
```

## Search with Filters

Search for videos with specific duration and theme:

```javascript
// Find short nature documentaries
const results = await client.searchVideos({
  q: 'nature documentary',
  duration_min: 60,      // At least 1 minute
  duration_max: 300,     // At most 5 minutes
  theme: 'nature',
  sort: 'popular',
  per_page: 10
});

console.log(`Found ${results.videos.length} short nature videos`);
```

## Fetch Video Details

Get full metadata for a video:

```javascript
const video = await client.getVideo('video_abc123');

console.log(`Title: ${video.title}`);
console.log(`Creator: ${video.creator.username}`);
if (video.location) {
  console.log(`Location: ${video.location.city}, ${video.location.region}`);
}
console.log(`Duration: ${video.duration}s`);
console.log(`Resolution: ${video.width}x${video.height}`);
if (video.keywords) {
  console.log(`Keywords: ${video.keywords.join(', ')}`);
}
```

## Batch Download Videos

Download multiple videos:

```javascript
const results = await client.searchVideos({ q: 'nature', per_page: 20 });

for (const video of results.videos) {
  try {
    const download = await client.downloadVideo(video.id, {
      expires_in: 5,
      search_id: results.search_id
    });
    console.log(`✓ ${video.title} -> ${download.url}`);
  } catch (error) {
    if (error instanceof GridbankAPIError) {
      console.log(`✗ ${video.title} failed: ${error.message}`);
    }
  }
}
```

## Check Quota Before Downloading

Verify your usage before large downloads:

```javascript
const usage = await client.usageSummary();
console.log(`Tier: ${usage.tier}`);
console.log(`Downloads used: ${usage.downloads_this_period}`);
console.log(`Period ends: ${usage.lease_period_end}`);
```

## Pagination Example

Iterate through all search results **sequentially** (page 1 → 2 → 3, etc.) for consistent results:

```javascript
let page = 1;
const allVideos = [];

while (true) {
  const results = await client.searchVideos({
    q: 'nature',
    page,
    per_page: 50
  });
  
  allVideos.push(...results.videos);
  console.log(`Fetched ${results.videos.length} videos from page ${page}`);
  
  // Always check has_more before requesting next page
  if (!results.has_more) {
    break;
  }
  
  // Move to next page sequentially
  page++;
}

console.log(`Total videos collected: ${allVideos.length}`);
```

**Important:** Always iterate sequentially from page 1. Jumping to arbitrary pages may return inconsistent results.

## Error Handling Best Practices

```javascript
import { GridbankClient, GridbankAPIError } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });

try {
  const video = await client.getVideo('video_xyz');
  
} catch (error) {
  if (error instanceof GridbankAPIError) {
    switch (error.statusCode) {
      case 401:
        console.error('API key is invalid. Check your credentials.');
        break;
      case 403:
        console.error('You don\'t have access. Upgrade your subscription.');
        break;
      case 404:
        console.error('Video not found. Try searching first.');
        break;
      case 429:
        console.error('Too many requests. Wait before retrying.');
        break;
      case 422:
        if (Array.isArray(error.details)) {
          error.details.forEach(err => {
            console.error(`Field ${err.loc.join('.')}: ${err.msg}`);
          });
        }
        break;
      default:
        console.error(`HTTP ${error.statusCode}: ${error.message}`);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## TypeScript Example

```typescript
import { GridbankClient, VideoListResponse, Video, GridbankAPIError } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });

async function findAndDownload(query: string): Promise<void> {
  try {
    const results: VideoListResponse = await client.searchVideos({ q: query, per_page: 5 });
    
    if (results.videos.length === 0) {
      console.log('No videos found.');
      return;
    }
    
    const video: Video = results.videos[0];
    const download = await client.downloadVideo(video.id, {
      search_id: results.search_id
    });
    
    console.log(`Downloaded: ${video.title}`);
    console.log(`URL: ${download.url}`);
  } catch (error) {
    if (error instanceof GridbankAPIError) {
      console.error(`HTTP ${error.statusCode}: ${error.message}`);
    } else {
      throw error;
    }
  }
}

findAndDownload('nature documentary');
```

## Environment Setup

Store credentials securely:

```bash
# .env file
VITE_GRIDBANK_API_KEY=apik_your_key_here
```

```javascript
// vite.config.js or similar
const apiKey = import.meta.env.VITE_GRIDBANK_API_KEY;
const client = new GridbankClient({ apiKey });
```

Or in Node.js:

```bash
# .env file
GRIDBANK_API_KEY=apik_your_key_here
```

```javascript
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GRIDBANK_API_KEY;
if (!apiKey) {
  throw new Error('GRIDBANK_API_KEY environment variable not set');
}

const client = new GridbankClient({ apiKey });
```

---

For more details, see:
- [Client Setup](client.md)
- [Method Reference](methods.md)
- [Error Handling](../errors.md)
