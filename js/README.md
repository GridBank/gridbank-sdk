# JavaScript SDK Documentation

Welcome to the GridBank JavaScript SDK documentation. This guide will help you integrate GridBank's video search and download API into your JavaScript or Node.js application.

## Getting Started

1. **[Installation](installation.md)** — Install with npm, yarn, or pnpm
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

```javascript
import { GridbankClient } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_your_key_here' });
```

### Core Methods

The SDK provides 4 core methods:

- **`searchVideos()`** — Search the video library with full-text search
- **`getVideo()`** — Fetch detailed metadata for a video
- **`downloadVideo()`** — Generate signed download URLs
- **`usageSummary()`** — Check your subscription tier and quota

### Error Handling

All methods throw `GridbankAPIError` on failures:

```javascript
import { GridbankAPIError } from '@gridbank/api-js';

try {
  const results = await client.searchVideos({ q: 'nature' });
} catch (error) {
  if (error instanceof GridbankAPIError) {
    console.error(`Error: ${error.code} - ${error.message}`);
  }
}
```

## Common Tasks

**Search for videos:**
```javascript
const results = await client.searchVideos({ q: 'skincare', perPage: 10 });
```

**Get video details:**
```javascript
const video = await client.getVideo('video_abc123');
console.log(`${video.title} by ${video.creator.name}`);
```

**Download a video:**
```javascript
const download = await client.downloadVideo('video_abc123');
console.log(`Download URL: ${download.url}`);
```

**Check your usage:**
```javascript
const usage = await client.usageSummary();
console.log(`Tier: ${usage.tier}`);
console.log(`Downloads used: ${usage.downloadsThisPeriod}`);
```

## TypeScript Support

Full TypeScript types are included out-of-the-box:

```typescript
import { GridbankClient, SearchResult } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });
const results: SearchResult = await client.searchVideos({ q: 'nature' });
```

## Troubleshooting

**Installation issues?** See [Installation Troubleshooting](installation.md#troubleshooting)

**Error with API key?** See [Error Codes](../api-reference.md#error-codes)

**Rate limited?** See [Rate Limiting](../api-reference.md#rate-limiting)

**TypeScript errors?** See [Installation - TypeScript Support](installation.md#typescript-support)

## Need Help?

- Email: hello@gridbank.io
- [API Status](https://gridbank.io)
- [Full API Reference](../api-reference.md)
