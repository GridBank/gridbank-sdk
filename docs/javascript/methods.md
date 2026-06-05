# JavaScript SDK Methods

All GridBank API methods are available through the `GridbankClient` instance. Methods use JavaScript naming conventions (camelCase) and return fully-typed objects for TypeScript support.

## searchVideos()

Query the GridBank video library with full-text search. Supports filtering by duration and category, with multiple sort options for relevance, popularity, and recency.

```javascript
const results = await client.searchVideos({
  q: 'skincare morning routine',
  sort: 'relevant',
  page: 1,
  perPage: 15,
  durationMin: undefined,
  durationMax: undefined,
  theme: undefined
});
```

**Parameters:**

- `q` (string, required): Search query (1–200 characters)
- `sort` (string, default `"relevant"`): Sort by `"relevant"`, `"popular"`, or `"recent"`
- `page` (number, default 1): Page number for pagination
- `perPage` (number, default 15): Results per page (1–80)
- `durationMin` (number | undefined): Minimum duration in seconds
- `durationMax` (number | undefined): Maximum duration in seconds
- `theme` (string | undefined): Content category filter

**Returns:**

```typescript
interface SearchResult {
  videos: Video[];        // Array of matching videos
  hasMore: boolean;       // True if more pages exist
  searchId: string;       // Unique search session ID
}
```

**Errors:** 400, 401, 422, 429, 500

**Example:**

```javascript
const results = await client.searchVideos({ q: 'nature', sort: 'relevant', page: 1, perPage: 15 });
console.log(`Found ${results.videos.length} videos`);
results.videos.forEach(video => {
  console.log(`  ${video.id}: ${video.title}`);
});
```

---

## getVideo()

Fetch complete metadata for a single video by ID, including creator details, dimensions, and licensing information. **Requires active subscription.**

```javascript
const video = await client.getVideo('video_abc123');
```

**Parameters:**

- `videoId` (string, required): Video identifier

**Returns:**

```typescript
interface Video {
  id: string;              // Video ID
  title: string;           // Title
  description: string;     // Long-form description
  duration: number;        // Duration in seconds
  width: number;           // Width in pixels
  height: number;          // Height in pixels
  url: string;             // Preview URL
  thumbnail: string;       // Thumbnail URL
  creator: Creator;        // Creator metadata
  location: Location;      // Location metadata
  contentTier: string;     // Licensing tier
  createdAt: string;       // Upload timestamp (ISO 8601)
  isFeatured: boolean;     // Featured flag
  keywords: string[];      // Associated keywords
}
```

**Errors:** 401, 403, 404, 429, 500

**Example:**

```javascript
const video = await client.getVideo('video_abc123');
console.log(`${video.title} (${video.duration}s)`);
console.log(`By ${video.creator.name}`);
console.log(`Keywords: ${video.keywords.join(', ')}`);
```

---

## downloadVideo()

Generate a time-limited, signed download URL for the original video file. Perfect for integrating video downloads into your application. **Requires active subscription.**

```javascript
const download = await client.downloadVideo('video_abc123', {
  expiresIn: 5,
  searchId: undefined
});
```

**Parameters:**

- `videoId` (string, required): Video identifier
- `expiresIn` (number, optional, default 5): URL expiration in minutes (1–5)
- `searchId` (string, optional): Search session ID for analytics

**Returns:**

```typescript
interface Download {
  url: string;              // Signed S3 download URL
  expiresAt: string;        // Expiration timestamp (ISO 8601)
}
```

**Errors:** 401, 403, 404, 429, 500

**Example:**

```javascript
const download = await client.downloadVideo('video_abc123', {
  expiresIn: 5,
  searchId: results.searchId
});
console.log(`Download expires at: ${download.expiresAt}`);
console.log(`URL: ${download.url}`);
```

---

## usageSummary()

Check your account's current subscription tier, download quota, and billing period. Use this to monitor your usage and determine when to upgrade your plan.

```javascript
const usage = await client.usageSummary();
```

**Parameters:** None

**Returns:**

```typescript
interface Usage {
  downloadsThisPeriod: number;  // Downloads used this billing period
  tier: string;                 // Subscription tier
  leasePeriodEnd: string;       // Period end timestamp (ISO 8601)
}
```

**Errors:** 401, 429, 500

**Example:**

```javascript
const usage = await client.usageSummary();
console.log(`Tier: ${usage.tier}`);
console.log(`Downloads this period: ${usage.downloadsThisPeriod}`);
console.log(`Period ends: ${usage.leasePeriodEnd}`);
```

---

## Exception Handling

All methods throw `GridbankAPIError` on errors:

```javascript
import { GridbankAPIError } from '@gridbank/api-js';

try {
  const video = await client.getVideo('invalid');
} catch (error) {
  if (error instanceof GridbankAPIError) {
    console.error(`Code: ${error.code}`);           // "not_found"
    console.error(`Message: ${error.message}`);     // "Video not found"
    console.error(`HTTP Status: ${error.statusCode}`); // 404
    if (error.details) {
      console.error('Details:', error.details);
    }
  }
}
```

---

## Next Step

See [end-to-end examples](examples.md).
