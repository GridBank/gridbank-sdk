# JavaScript SDK Methods

All GridBank API methods are available through the `GridbankClient` instance. Methods use JavaScript naming conventions (camelCase) and return fully-typed objects for TypeScript support.

Note: option and response field names use **snake_case** to match the API wire format.

## searchVideos()

Query the GridBank video library with full-text search. Supports filtering by duration and category, with multiple sort options for relevance, popularity, and recency.

```javascript
const results = await client.searchVideos({
  q: 'skincare morning routine',
  sort: 'relevant',
  page: 1,
  per_page: 15,
  duration_min: undefined,
  duration_max: undefined,
  theme: undefined
});
```

**Parameters:**

- `q` (string, required): Search query (1–200 characters)
- `sort` (string, default `"relevant"`): Sort by `"relevant"`, `"popular"`, or `"recent"`
- `page` (number, default 1): Page number for pagination
- `per_page` (number, default 15): Results per page (1–80)
- `duration_min` (number | undefined): Minimum duration in seconds
- `duration_max` (number | undefined): Maximum duration in seconds
- `theme` (string | undefined): Content category filter
- `search_id` (string | undefined): Search session ID to continue a paginated session

**Returns:**

```typescript
interface VideoListResponse {
  search_id: string;      // Unique search session ID
  page: number;           // Current page number
  per_page: number;       // Results per page
  has_more: boolean;      // True if more pages exist
  videos: Video[];        // Array of matching videos
}
```

**Errors:** 400, 401, 422, 429, 500

**Example:**

```javascript
const results = await client.searchVideos({ q: 'nature', sort: 'relevant', page: 1, per_page: 15 });
console.log(`Found ${results.videos.length} videos`);
results.videos.forEach(video => {
  console.log(`  ${video.id}: ${video.title}`);
});
```

---

## getVideo()

Fetch complete metadata for a single video by ID, including creator details and dimensions. **Requires active subscription.**

```javascript
const video = await client.getVideo('video_abc123');
```

**Parameters:**

- `videoId` (string, required): Video identifier

**Returns:**

```typescript
interface Video {
  id: string;              // Video ID
  creator: Creator;        // Creator metadata
  title?: string | null;   // Title
  description?: string | null; // Long-form description
  duration?: number | null;    // Duration in seconds
  width?: number | null;       // Width in pixels
  height?: number | null;      // Height in pixels
  url?: string | null;         // Preview URL
  thumbnail?: string | null;   // Thumbnail URL
  location?: Location | null;  // Location metadata
  keywords?: string[] | null;  // Associated keywords
}
```

**Errors:** 401, 403, 404, 429, 500

**Example:**

```javascript
const video = await client.getVideo('video_abc123');
console.log(`${video.title} (${video.duration}s)`);
console.log(`By ${video.creator.username}`);
if (video.keywords) {
  console.log(`Keywords: ${video.keywords.join(', ')}`);
}
```

---

## downloadVideo()

Generate a time-limited, signed download URL for the original video file. **Requires active subscription.**

```javascript
const download = await client.downloadVideo('video_abc123', {
  expires_in: 5,
  search_id: undefined
});
```

**Parameters:**

- `videoId` (string, required): Video identifier
- `expires_in` (number, optional, default 5): URL expiration in minutes (1–5)
- `search_id` (string, optional): Search session ID for analytics

**Returns:**

```typescript
interface DownloadResult {
  video_id: string;         // Video ID
  url: string;              // Signed download URL
  expires_at: string;       // Expiration timestamp (ISO 8601)
  file_size: number;        // File size in bytes
  format: string;           // File format (e.g. "mp4")
}
```

**Errors:** 401, 403, 404, 429, 500

**Example:**

```javascript
const download = await client.downloadVideo('video_abc123', {
  expires_in: 5,
  search_id: results.search_id
});
console.log(`Download expires at: ${download.expires_at}`);
console.log(`URL: ${download.url}`);
```

---

## usageSummary()

Check your account's current subscription tier, download quota, and billing period.

```javascript
const usage = await client.usageSummary();
```

**Parameters:** None

**Returns:**

```typescript
interface UsageSummary {
  customer_id: string;              // Customer identifier
  tier: string;                     // Subscription tier
  lease_period_start: string;       // Period start timestamp (ISO 8601)
  lease_period_end: string;         // Period end timestamp (ISO 8601)
  downloads_this_period: number;    // Downloads used this billing period
  active_collections_count: number; // Number of active collections
  wildcard_enabled: boolean;        // Whether wildcard access is enabled
  top_videos: TopVideo[];           // Most downloaded videos this period
}
```

**Errors:** 401, 429, 500

**Example:**

```javascript
const usage = await client.usageSummary();
console.log(`Tier: ${usage.tier}`);
console.log(`Downloads this period: ${usage.downloads_this_period}`);
console.log(`Period ends: ${usage.lease_period_end}`);
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
    console.error(`HTTP ${error.statusCode}: ${error.message}`);
    if (error.details) {
      console.error('Details:', error.details);
    }
  }
}
```

---

## Next Step

See [end-to-end examples](examples.md).
