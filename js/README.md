# @gridbank/api-js

Official JavaScript/TypeScript SDK for the GridBank API.

**Docs:** https://docs.gridbank.io/javascript.html

## Install

```bash
npm install @gridbank/api-js
```

Requires Node.js 18+. TypeScript types included.

## Usage

```javascript
import { GridbankClient } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });

const results = await client.searchVideos({ q: 'nature', per_page: 10 });
for (const video of results.videos) {
  console.log(video.title);
}
```

## Options

```javascript
const client = new GridbankClient({
  apiKey: 'apik_...',
  maxRetries: 3, // retries on 429, honours Retry-After header (default: 3, set 0 to disable)
});
```

## Error Handling

```javascript
import { GridbankClient, GridbankAPIError } from '@gridbank/api-js';

try {
  const results = await client.searchVideos({ q: 'nature' });
} catch (error) {
  if (error instanceof GridbankAPIError) {
    console.error(`Error ${error.code}: ${error.message}`);
  }
}
```
