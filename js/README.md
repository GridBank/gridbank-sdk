# @gridbank/api-js

Official JavaScript/TypeScript SDK for the GridBank API.

**Docs:** https://docs.gridbank.io/javascript.html

## Install

```bash
npm install @gridbank/api-js
```

Requires Node.js 18+. TypeScript types included.

## Which client

The package ships two clients for two separate products. Neither is built on the other, and
neither is the "main" one — they serve different audiences with different credentials. Both
import from `@gridbank/api-js`.

| Client | Product | Serves | Credential |
|--------|---------|--------|------------|
| `PartnerClient` | Partner API | the videos **your own account has licensed** | member API key |
| `EnterpriseClient` | Enterprise API (B2B) | leased collections on an **enterprise contract** | customer API key |

Reaching your own library from your own tools → `PartnerClient`.
On an enterprise contract, searching leased collections → `EnterpriseClient`.

---

## `PartnerClient` — your licensed library

```ts
import { PartnerClient, NotLicensed } from '@gridbank/api-js';

const client = new PartnerClient({ apiKey: 'apik_...', userAgent: 'your-app/1.0' });

// Pages are fetched as you consume them, so stopping early costs nothing.
for await (const video of client.content()) {
  console.log(video.id, video.title);
}

try {
  const response = await client.fetchDownload('video_019b12...');
  // Node: pipe response.body to a file. Browser: await response.blob().
} catch (error) {
  if (error instanceof NotLicensed) {
    console.log('not licensed by this account');
  }
}
```

`fetchDownload()` returns the `Response` rather than writing to disk, because the
package runs in browsers as well as Node and only the caller knows where the bytes
belong. The five-minute signed-URL expiry is retried once internally.

### Options

```ts
const client = new PartnerClient({
  apiKey: 'apik_...',
  userAgent: 'your-app/1.0', // identify your app; unidentified traffic can be blocked
  timeoutMs: 30_000,
  maxRetries: 3, // total attempts on 429, honours Retry-After (1 or 0 disables retrying)
  // The API allows 600 requests per minute per key.
});
```

### Errors

All extend `ContentError`, which carries `statusCode`, `message`, and `details`.

| Error | Meaning |
|-------|---------|
| `NotLicensed` | the video exists, but this account has not licensed it |
| `VideoNotFound` | no video with that key |
| `NotAuthenticated` | the API key is missing, malformed, or revoked |

---

## `EnterpriseClient` — enterprise collections

> Renamed in 0.3.0. `GridbankClient` and `GridbankAPIError` still work as deprecated
> aliases; they are removed in 1.0.

```javascript
import { EnterpriseClient } from '@gridbank/api-js';

const client = new EnterpriseClient({ apiKey: 'apik_...' });

const results = await client.searchVideos({ q: 'nature', per_page: 10 });
for (const video of results.videos) {
  console.log(video.title);
}
```

### Options

```javascript
const client = new EnterpriseClient({
  apiKey: 'apik_...',
  maxRetries: 3, // retries on 429, honours Retry-After header (default: 3, set 0 to disable)
});
```

### Errors

```javascript
import { EnterpriseClient, EnterpriseAPIError } from '@gridbank/api-js';

try {
  const results = await client.searchVideos({ q: 'nature' });
} catch (error) {
  if (error instanceof EnterpriseAPIError) {
    console.error(`Error ${error.code}: ${error.message}`);
  }
}
```
