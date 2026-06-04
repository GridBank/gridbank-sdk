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
    perPage: 5
  });
  
  console.log(`Found ${results.videos.length} videos (search_id: ${results.searchId})`);
  
  // Get the first result
  if (results.videos.length > 0) {
    const video = results.videos[0];
    console.log(`\nTop result: ${video.title}`);
    console.log(`Duration: ${video.duration}s | Creator: ${video.creator.name}`);
    
    // Download the video
    const download = await client.downloadVideo(video.id, {
      expiresIn: 5,
      searchId: results.searchId  // track funnel
    });
    
    console.log(`\nDownload URL: ${download.url}`);
    console.log(`Expires: ${download.expiresAt}`);
    
    // Check usage
    const usage = await client.usageSummary();
    console.log(`\nUsage: ${usage.downloadsThisPeriod} downloads used`);
    console.log(`Tier: ${usage.tier}`);
  }
  
} catch (error) {
  if (error instanceof GridbankAPIError) {
    console.error(`API Error ${error.code}: ${error.message}`);
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
  durationMin: 60,      // At least 1 minute
  durationMax: 300,     // At most 5 minutes
  theme: 'nature',
  sort: 'popular',
  perPage: 10
});

console.log(`Found ${results.videos.length} short nature videos`);
```

## Fetch Video Details

Get full metadata for a video:

```javascript
const video = await client.getVideo('video_abc123');

console.log(`Title: ${video.title}`);
console.log(`Creator: ${video.creator.name} (@${video.creator.username})`);
console.log(`Location: ${video.location.city}, ${video.location.region}`);
console.log(`Duration: ${video.duration}s`);
console.log(`Resolution: ${video.width}x${video.height}`);
console.log(`Tier: ${video.contentTier}`);
console.log(`Featured: ${video.isFeatured}`);
console.log(`Keywords: ${video.keywords.join(', ')}`);
console.log(`Uploaded: ${video.createdAt}`);
```

## Batch Download Videos

Download multiple videos:

```javascript
const results = await client.searchVideos({ q: 'nature', perPage: 20 });

for (const video of results.videos) {
  try {
    const download = await client.downloadVideo(video.id, {
      expiresIn: 5,
      searchId: results.searchId
    });
    console.log(`✓ ${video.title} -> ${download.url}`);
  } catch (error) {
    if (error instanceof GridbankAPIError) {
      console.log(`✗ ${video.title} failed: ${error.message}`);
    }
  }
}
```

## Handle Rate Limiting

Implement retry logic for rate-limited requests:

```javascript
async function searchWithRetry(query, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await client.searchVideos({ q: query, perPage: 50 });
    } catch (error) {
      if (error instanceof GridbankAPIError && error.code === 'rate_limited' && attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000;  // exponential backoff: 1s, 2s, 4s
        console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
}

const results = await searchWithRetry('nature');
```

## Check Quota Before Downloading

Verify you have remaining quota before large downloads:

```javascript
const usage = await client.usageSummary();
console.log(`Tier: ${usage.tier}`);
console.log(`Downloads used: ${usage.downloadsThisPeriod}`);
console.log(`Period ends: ${usage.leasePeriodEnd}`);

// Tier limits (example)
const tierLimits = {
  'starter': 100,
  'pro': 1000,
  'enterprise': Infinity
};

const limit = tierLimits[usage.tier] || 0;
const remaining = limit - usage.downloadsThisPeriod;

console.log(`Remaining quota: ${remaining}`);

if (remaining < 10) {
  console.warn('⚠️ Running low on quota. Upgrade or wait for period reset.');
}
```

## Pagination Example

Iterate through all search results:

```javascript
let page = 1;
const allVideos = [];

while (true) {
  const results = await client.searchVideos({
    q: 'nature',
    page,
    perPage: 50
  });
  
  allVideos.push(...results.videos);
  console.log(`Fetched ${results.videos.length} videos from page ${page}`);
  
  if (!results.hasMore) {
    break;
  }
  
  page++;
}

console.log(`Total videos collected: ${allVideos.length}`);
```

## Error Handling Best Practices

```javascript
import { GridbankClient, GridbankAPIError } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });

try {
  const video = await client.getVideo('video_xyz');
  
} catch (error) {
  if (error instanceof GridbankAPIError) {
    // Handle specific API errors
    switch (error.code) {
      case 'unauthorized':
        console.error('API key is invalid. Check your credentials.');
        break;
      case 'forbidden':
        console.error('You don\'t have access. Upgrade your subscription.');
        break;
      case 'not_found':
        console.error('Video not found. Try searching first.');
        break;
      case 'rate_limited':
        console.error('Too many requests. Wait before retrying.');
        break;
      case 'validation_error':
        error.details?.forEach(err => {
          console.error(`Field ${err.loc.join('.')}: ${err.msg}`);
        });
        break;
      default:
        console.error(`API Error: ${error.message}`);
    }
  } else {
    // Handle unexpected errors
    console.error('Unexpected error:', error);
  }
}
```

## TypeScript Example

```typescript
import { GridbankClient, SearchResult, Video, GridbankAPIError } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });

async function findAndDownload(query: string): Promise<void> {
  try {
    const results: SearchResult = await client.searchVideos({ q: query, perPage: 5 });
    
    if (results.videos.length === 0) {
      console.log('No videos found.');
      return;
    }
    
    const video: Video = results.videos[0];
    const download = await client.downloadVideo(video.id, {
      searchId: results.searchId
    });
    
    console.log(`Downloaded: ${video.title}`);
    console.log(`URL: ${download.url}`);
  } catch (error) {
    if (error instanceof GridbankAPIError) {
      console.error(`Error: ${error.code} - ${error.message}`);
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
- [Rate Limits](../advanced/rate-limits.md)
