# Enterprise API

Search the GridBank catalogue and download from the collection your contract leases, with
metadata, signed URLs, and usage reporting.

!!! info "Looking for your own licensed library?"
    This is the Enterprise API, for leased collections on an enterprise contract. To read
    and download the clips your own account has paid for, see the
    [Partner API](../partner/index.md). Separate products, separate credentials.

## Quick Start

Choose your SDK and get started in minutes.

### Python SDK

```bash
pip install gridbank-api
```

```python
from gridbank_api import GridbankClient

client = GridbankClient(api_key="apik_...")
results = client.search_videos(q="nature", per_page=5)
print(f"Found {len(results.videos)} videos")
```

[View Python Documentation](python/overview.md)

### JavaScript SDK

```bash
npm install @gridbank/api-js
```

```javascript
import { GridbankClient } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });
const results = await client.searchVideos({ q: 'nature', perPage: 5 });
console.log(`Found ${results.videos.length} videos`);
```

[View JavaScript Documentation](javascript/overview.md)

## Features

- **Full-text video search** with relevance, popularity, and recency sorting
- **Video metadata** including creator info, dimensions, and licensing tiers
- **Signed download URLs** with configurable expiration (1–5 minutes)
- **Usage tracking** to monitor subscription tier and download quota
- **Rate limiting** based on your tier (starter, pro, enterprise)

## API Endpoints

The Enterprise API consists of 4 core endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/external/v1/videos/search` | `GET` | Full-text video search with pagination |
| `/external/v1/videos/{video_id}` | `GET` | Fetch metadata for a single video |
| `/external/v1/videos/{video_id}/download` | `GET` | Generate signed download URL |
| `/external/v1/usage/me` | `GET` | Check subscription tier and usage |

The `/external/` path prefix is the original route name and is unchanged — only the
product name is "Enterprise API".

## Authentication

All requests require a Bearer token in the `Authorization` header.

```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" https://api2.gridbank.io/external/v1/videos/search?q=nature
```

## SDKs

We provide official SDKs for Python and JavaScript to make integration simple:

- **[Python SDK](python/overview.md)** — Type-safe, Pythonic API wrapper
- **[JavaScript SDK](javascript/overview.md)** — ESM modules with TypeScript support

## Support

- **[API Reference](api-reference.md)** — Complete endpoint documentation
- **[Getting Started](getting-started.md)** — Key, install, first request
- **Email:** support@gridbank.io
