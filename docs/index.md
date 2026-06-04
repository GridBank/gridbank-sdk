---
title: GridBank SDK
---

# GridBank SDK

Official Python and JavaScript SDKs for the [GridBank External API](https://api2.gridbank.io/external/v1). Thin typed wrappers over the REST endpoints — types generated from the OpenAPI spec.

> **Preview:** SDKs launch with the API. Package names below are locked for release.

## Installation

**Python**
```bash
pip install gridbank-api
```

**JavaScript / TypeScript**
```bash
npm install @gridbank/api-js
```

---

## Authentication

Both SDKs require an API key passed at client initialization. The key is sent automatically via `X-API-Key` on every request.

**Python**
```python
from gridbank_api import GridbankClient

client = GridbankClient(api_key="apik_...")
```

**JavaScript**
```javascript
import { GridbankClient } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });
```

If you receive a `401 Unauthorized`, verify your key is correct and has not expired.

---

## Error Codes

All SDK methods raise/throw on non-2xx responses.

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `invalid_request` | Malformed query or invalid parameters |
| 401 | `unauthorized` | Missing or invalid API key |
| 403 | `forbidden` | No active subscription |
| 404 | `not_found` | Resource does not exist |
| 422 | — | Invalid input data (see `detail` array for field errors) |
| 429 | `rate_limited` | Rate limit exceeded — retry after delay |
| 500 | `internal_error` | Server error — retry the request |

**Error envelope (non-422):**
```json
{ "detail": "Human readable error message" }
```

**422 envelope:**
```json
{
  "detail": [
    { "loc": ["query", "expires_in"], "msg": "Input should be less than or equal to 5", "type": "less_than_equal" }
  ]
}
```

---

## SDK Reference

- [Python SDK →](python.html)
- [JavaScript SDK →](javascript.html)
