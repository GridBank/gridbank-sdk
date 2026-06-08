# JavaScript SDK Client Setup

Initialize and configure the GridBank API client for your JavaScript/TypeScript application.

## Basic Initialization

Create a client with just your API key:

```javascript
import { GridbankClient } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_your_key_here' });
```

**Get your API key:** Contact [hello@gridbank.io](mailto:hello@gridbank.io) — keys are provisioned manually during onboarding.

## Configuration Options

Customize client behavior with advanced options:

```javascript
const client = new GridbankClient({
  apiKey: 'apik_your_key_here',
  baseUrl: 'https://api2.gridbank.io',  // Default API endpoint
  maxRetries: 3,                        // Retry on 429 (default: 3, set 0 to disable)
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | required | Your GridBank API key |
| `baseUrl` | `string` | `https://api2.gridbank.io` | API base URL |
| `maxRetries` | `number` | `3` | Max retries on rate limit (429). Uses `Retry-After` header if present, otherwise exponential backoff. |

## Secure API Key Management (Recommended)

Never hardcode API keys. Store them in environment variables.

**For Vite/React:**
```bash
# .env file
VITE_GRIDBANK_API_KEY=apik_your_key_here
```

```javascript
const apiKey = import.meta.env.VITE_GRIDBANK_API_KEY;
if (!apiKey) {
  throw new Error('VITE_GRIDBANK_API_KEY environment variable not set');
}
const client = new GridbankClient({ apiKey });
```

**For Node.js:**
```bash
# .env file or export in terminal
export GRIDBANK_API_KEY=apik_your_key_here
```

```javascript
const apiKey = process.env.GRIDBANK_API_KEY;
if (!apiKey) {
  throw new Error('GRIDBANK_API_KEY environment variable not set');
}
const client = new GridbankClient({ apiKey });
```

## Error Handling

All SDK methods throw `GridbankAPIError` on API errors. Handle them gracefully:

```javascript
import { GridbankClient, GridbankAPIError } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });

try {
  const results = await client.searchVideos({ q: 'test' });
} catch (error) {
  if (error instanceof GridbankAPIError) {
    console.error(`HTTP ${error.statusCode}: ${error.message}`);
    if (error.details) {
      console.error('Details:', error.details);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

See [Error Handling Guide](../api-reference.md#error-codes) for detailed error information.

## TypeScript Support

Full type definitions are included for excellent IDE support:

```typescript
import { GridbankClient, VideoListResponse, Video } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });

// Full type inference
const results: VideoListResponse = await client.searchVideos({ 
  q: 'nature', 
  per_page: 5 
});

// IDE autocomplete for all properties
results.videos.forEach((video: Video) => {
  console.log(`${video.title} by ${video.creator.name}`);
});
```

## Next Steps

- [Method Reference](methods.md) — Complete method documentation
- [Code Examples](examples.md) — Real-world usage patterns
- [Error Handling](../api-reference.md#error-codes) — Learn error codes
