# JavaScript SDK

The official GridBank JavaScript SDK provides a modern, async-first wrapper around the REST API. Built with TypeScript, it delivers full type safety, excellent IDE support, and a developer-friendly API.

## Why Use the SDK?

- **TypeScript support** — Full type definitions for IDE autocomplete and type safety
- **Promise-based** — Modern async/await syntax for clean, readable code
- **Error handling** — Automatic exception throwing with detailed error information
- **Tree-shakeable** — ESM modules for optimal bundle size in production
- **Browser & Node.js** — Works in browsers and Node.js environments

## Installation

**npm:**
```bash
npm install @gridbank/api-js
```

**yarn:**
```bash
yarn add @gridbank/api-js
```

**Requirements:** Node.js 14+ or modern browser with ES2020 support

## Quick Example

```javascript
import { GridbankClient } from '@gridbank/api-js';

// Initialize the client with your API key
const client = new GridbankClient({ apiKey: 'apik_...' });

// Search for videos
const results = await client.searchVideos({ q: 'nature', perPage: 5 });

// Display results
for (const video of results.videos) {
  console.log(`${video.title} (${video.duration}s)`);
  console.log(`  Creator: ${video.creator.name}`);
}
```

## What's Included

- **GridbankClient** — Main API client with 4 core methods
- **searchVideos()** — Full-text video search with pagination
- **getVideo()** — Fetch complete video metadata (requires subscription)
- **downloadVideo()** — Generate signed download URLs (requires subscription)
- **usageSummary()** — Check your account tier and download quota
- **GridbankAPIError** — Exception class for comprehensive error handling
- **TypeScript types** — Full type definitions for all objects and responses

## Authentication

All requests require a Bearer token. [Get your API key →](../api-reference.md#authentication)

```javascript
const client = new GridbankClient({ apiKey: 'apik_your_key_here' });
```

## Next Steps

- [Installation Guide](installation.md) — Detailed setup instructions
- [Client Setup](client.md) — Initialize and configure the client
- [Method Reference](methods.md) — Complete API method documentation
- [Code Examples](examples.md) — Real-world usage patterns
- [API Reference](../api-reference.md) — Full REST API specification
- [Error Handling](../api-reference.md#error-codes) — Handle errors gracefully
