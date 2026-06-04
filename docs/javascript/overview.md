# JavaScript SDK

The official GridBank JavaScript SDK provides a modern, async-first wrapper around the REST API. Built with TypeScript, it offers full type safety and excellent IDE support.

## Why Use the SDK?

- **TypeScript support** — Full type definitions for autocomplete
- **Promise-based** — Modern async/await syntax
- **Error handling** — Automatic exception throwing for non-2xx responses
- **Tree-shakeable** — ESM modules for optimal bundle size
- **Retry logic** — Built-in exponential backoff for rate limits
- **Convenience** — No manual header management or JSON parsing

## Installation

```bash
npm install @gridbank/api-js
```

or with yarn:

```bash
yarn add @gridbank/api-js
```

Requires Node.js 14+ or modern browser with ES2020 support

## Quick Example

```javascript
import { GridbankClient } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });
const results = await client.searchVideos({ q: 'nature', perPage: 5 });

for (const video of results.videos) {
  console.log(`${video.title} (${video.duration}s)`);
}
```

## What's Included

- `GridbankClient` — Main API client class
- 5 methods — `searchVideos()`, `getVideo()`, `downloadVideo()`, `usageSummary()`, `health()`
- Error class — `GridbankAPIError` for error handling
- TypeScript types — Full type definitions for all objects

## Next Steps

- [Installation Guide](installation.md)
- [Client Setup](client.md)
- [Method Reference](methods.md)
- [Examples](examples.md)
