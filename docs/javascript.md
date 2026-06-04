---
title: JavaScript SDK
---

# JavaScript SDK Reference

[← Back to overview](index.html)

**Install:** `npm install @gridbank/api-js`  
**Requires:** Node.js 18+ · TypeScript 5+ (optional but recommended)

---

## GridbankClient

```javascript
import { GridbankClient } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });
```

### `searchVideos`

```typescript
searchVideos(options: SearchVideosOptions): Promise<SearchResult>
```

```typescript
interface SearchVideosOptions {
  q: string;
  sort?: 'relevant' | 'popular' | 'recent';  // default: 'relevant'
  page?: number;                               // default: 1
  per_page?: number;                           // default: 15, max: 80
  duration_min?: number;
  duration_max?: number;
  theme?: string;
}
```

**Returns** `SearchResult`:
- `videos: Video[]`
- `has_more: boolean`
- `search_id: string` — pass to `downloadVideo` for funnel tracking

---

### `getVideo`

```typescript
getVideo(videoId: string): Promise<Video>
```

Requires active subscription. Returns full `Video` metadata.

---

### `downloadVideo`

```typescript
downloadVideo(videoId: string, options?: DownloadVideoOptions): Promise<DownloadResult>
```

```typescript
interface DownloadVideoOptions {
  expiresIn?: number;   // 1–5 minutes, default: 5
  searchId?: string;
}
```

Requires active subscription. Returns a signed S3 URL valid for `expiresIn` minutes.

**Returns** `DownloadResult`:
- `url: string`
- `expires_at: string` — ISO 8601

---

### `usageSummary`

```typescript
usageSummary(): Promise<UsageSummary>
```

**Returns** `UsageSummary`:
- `downloads_this_period: number`
- `tier: string` — `"starter"` · `"pro"` · `"enterprise"`
- `lease_period_end: string` — ISO 8601

---

## Data Models

### `Video`
| Field | Type |
|-------|------|
| `id` | `string` |
| `title` | `string` |
| `description` | `string` |
| `duration` | `number` |
| `width` | `number` |
| `height` | `number` |
| `url` | `string` — watermarked preview |
| `thumbnail` | `string` — watermarked thumbnail |
| `creator` | `Creator` |
| `location` | `Location` |
| `content_tier` | `string` |
| `created_at` | `string` — ISO 8601 |
| `is_featured` | `boolean` |
| `keywords` | `string[]` |

### `Creator`
`id · name · username · bio · profile_image`

### `Location`
`city · region · country`

---

## First Call Example

```javascript
import { GridbankClient } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_your_key_here' });

try {
  // Search
  const results = await client.searchVideos({
    q: 'morning skincare routine',
    sort: 'relevant',
    per_page: 5,
  });
  console.log(`Found ${results.videos.length} videos (search_id: ${results.search_id})`);

  if (results.videos.length > 0) {
    const video = results.videos[0];
    console.log(`Top result: ${video.title} (${video.duration}s) by ${video.creator.name}`);

    // Download
    const download = await client.downloadVideo(video.id, {
      expiresIn: 5,
      searchId: results.search_id,
    });
    console.log(`Download URL: ${download.url}`);
    console.log(`Expires: ${download.expires_at}`);

    // Usage
    const usage = await client.usageSummary();
    console.log(`Tier: ${usage.tier} | Downloads used: ${usage.downloads_this_period}`);
  }
} catch (error) {
  if (error.code) {
    console.error(`API Error ${error.code}: ${error.message}`);
  } else {
    console.error('Error:', error);
  }
}
```

## Pagination

Always paginate sequentially — arbitrary page jumps may return inconsistent results.

```javascript
let page = 1;
while (true) {
  const results = await client.searchVideos({ q: 'nature', page, per_page: 50 });
  for (const video of results.videos) {
    process(video);
  }
  if (!results.has_more) break;
  page++;
}
```

## Rate Limits

On `429`, back off and retry. Check the `Retry-After` response header.
