# GridBank SDK

Official Python and JavaScript SDKs for the GridBank APIs.

**Documentation:** https://docs.gridbank.io

## Packages

| Language | Package | Version |
|----------|---------|---------|
| Python | [`gridbank-api`](https://pypi.org/project/gridbank-api/) | `0.3.0` |
| JavaScript | [`@gridbank/api-js`](https://www.npmjs.com/package/@gridbank/api-js) | `0.3.0` |

## Clients

Each package ships two clients for two separate products. Neither is built on the other.

| Client | Product | Serves | Credential |
|--------|---------|--------|------------|
| `PartnerClient` | Partner API | the videos an account has **licensed** | member API key |
| `EnterpriseClient` | Enterprise API (B2B) | leased collections on an **enterprise contract** | customer API key |

## Quick Start

**Python**
```bash
pip install gridbank-api
```
```python
from gridbank_api import PartnerClient

client = PartnerClient(api_key="apik_...", user_agent="your-app/1.0")

for video in client.content():
    client.download(video.id, f"{video.id}.mp4")
```

**JavaScript**
```bash
npm install @gridbank/api-js
```
```javascript
import { PartnerClient } from '@gridbank/api-js';

const client = new PartnerClient({ apiKey: 'apik_...', userAgent: 'your-app/1.0' });

for await (const video of client.content()) {
  console.log(video.id, video.title);
}
```

For the enterprise client, see the per-package READMEs: [Python](python/README.md), [JavaScript](js/README.md).
