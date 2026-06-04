# JavaScript SDK Client

## Initializing the Client

```javascript
import { GridbankClient } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_your_key_here' });
```

The `apiKey` is required. Get your key from the [GridBank dashboard](https://gridbank.io/dashboard).

## Configuration Options

```javascript
const client = new GridbankClient({
  apiKey: 'apik_your_key_here',
  baseUrl: 'https://api.gridbank.io',  // Default
  timeout: 30000,                       // Timeout in ms (default)
  maxRetries: 3,                        // Retries for 429
});
```

## Using Environment Variables

Store your API key in an environment variable:

```bash
# .env file
VITE_GRIDBANK_API_KEY=apik_your_key_here
```

Then load it in your code:

```javascript
const apiKey = import.meta.env.VITE_GRIDBANK_API_KEY;
const client = new GridbankClient({ apiKey });
```

Or in Node.js:

```javascript
const apiKey = process.env.GRIDBANK_API_KEY;
const client = new GridbankClient({ apiKey });
```

## Error Handling

All methods throw `GridbankAPIError` on non-2xx responses:

```javascript
import { GridbankClient, GridbankAPIError } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });

try {
  const results = await client.searchVideos({ q: 'test' });
} catch (error) {
  if (error instanceof GridbankAPIError) {
    console.error(`Error ${error.code}: ${error.message}`);
    console.error(`HTTP Status: ${error.statusCode}`);
    if (error.details) {
      console.error('Details:', error.details);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## TypeScript Support

Full type definitions are included:

```typescript
import { GridbankClient, SearchResult, Video } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });

// Types are automatically inferred
const results: SearchResult = await client.searchVideos({ q: 'nature', perPage: 5 });

// IDE knows about Video properties
results.videos.forEach((video: Video) => {
  console.log(video.title);
});
```

## Next Step

Explore all available [methods](methods.md).
