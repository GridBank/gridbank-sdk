# API Reference

## Endpoints

The GridBank API provides 4 core endpoints for video search, metadata retrieval, downloads, and account management.

### Search Videos

```
GET /search
```

Query the GridBank video library with full-text search. Returns paginated results with relevance scoring.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | — | Search query (1–200 characters) |
| `sort` | string | No | `relevant` | Sort by: `relevant`, `popular`, or `recent` |
| `page` | integer | No | 1 | Page number for pagination |
| `per_page` | integer | No | 15 | Results per page (1–80) |
| `duration_min` | integer | No | — | Minimum video duration (seconds) |
| `duration_max` | integer | No | — | Maximum video duration (seconds) |
| `theme` | string | No | — | Content category filter |

**Response:**

```json
{
  "videos": [
    {
      "id": "video_abc123",
      "title": "Nature Documentary",
      "duration": 600,
      "creator": { "name": "Jane Doe", "username": "jane_doe" },
      "url": "https://...",
      "thumbnail": "https://..."
    }
  ],
  "has_more": true,
  "search_id": "search_xyz789"
}
```

**Errors:** 400, 401, 422, 429, 500

---

### Get Video Metadata

```
GET /videos/{id}
```

Fetch complete metadata for a single video by ID. Includes creator info, thumbnail, and content details. **Requires active subscription.**

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Video ID (alphanumeric, hyphens, underscores) |

**Response:**

```json
{
  "id": "video_abc123",
  "title": "Morning Skincare Routine",
  "description": "A step-by-step guide to morning skincare...",
  "duration": 480,
  "width": 1920,
  "height": 1080,
  "url": "https://...",
  "thumbnail": "https://...",
  "creator": {
    "name": "Jane Doe",
    "username": "jane_doe",
    "bio": "Beauty & wellness creator"
  },
  "location": {
    "city": "San Francisco",
    "region": "CA",
    "country_code": "US"
  },
  "content_tier": "base",
  "created_at": "2024-01-15T10:30:00Z",
  "is_featured": true,
  "keywords": ["skincare", "morning routine", "tutorial"]
}
```

**Errors:** 401, 403, 404, 429, 500

---

### Download Video

```
POST /videos/{id}/download
```

Generate a time-limited, signed download URL for the original video file. **Requires active subscription.**

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Video ID |

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `expires_in` | integer | No | 5 | URL expiration in minutes (1–5) |
| `search_id` | string | No | — | Search session ID for analytics |

**Response:**

```json
{
  "url": "https://s3.amazonaws.com/gridbank/video_abc123?signature=...",
  "expires_at": "2024-01-15T10:35:00Z"
}
```

**Errors:** 401, 403, 404, 429, 500

---

### Check Usage & Subscription

```
GET /usage/me
```

Fetch your account's current usage metrics and subscription details.

**Response:**

```json
{
  "downloads_this_period": 42,
  "tier": "pro",
  "lease_period_end": "2024-02-15T00:00:00Z"
}
```

**Errors:** 401, 429, 500

---

## Error Codes

All API errors follow this pattern:

```json
{
  "detail": "Human-readable error message"
}
```

### Common HTTP Status Codes

| Code | Name | Meaning | What to do |
|------|------|---------|-----------|
| **401** | Unauthorized | Missing or invalid Bearer token | Check your API token is correct and hasn't expired |
| **403** | Forbidden | No active subscription for this operation | Upgrade your subscription plan at [YOUR_DASHBOARD_URL] |
| **404** | Not Found | Video ID doesn't exist or resource not found | Verify the video ID exists by searching first |
| **429** | Too Many Requests | Rate limit exceeded | Wait before retrying (see `Retry-After` header) |
| **500** | Server Error | Temporary server issue | Retry the request after a short delay |

### Error Details

**401 Unauthorized**
- Your Bearer token is missing, invalid, or expired
- Solution: Generate a new token from your dashboard

**403 Forbidden**
- Your account doesn't have access to this endpoint
- Typically means you need an active subscription to download videos
- Solution: Upgrade your plan or contact support

**404 Not Found**
- The video ID doesn't exist in our library
- Solution: Use search to find valid video IDs first

**429 Rate Limited**
- You've made too many requests too quickly
- Check the `X-RateLimit-*` response headers
- Respect the `Retry-After` header for how long to wait
- Solution: Implement exponential backoff or upgrade to higher tier

**500 Server Error**
- Something went wrong on our end (rare)
- Solution: Retry after a few seconds

---

## Authentication

All requests require a Bearer token in the `Authorization` header:

```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" https://api.gridbank.io/search?q=nature
```

---

## Rate Limiting

All responses include rate limit headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1705330800
Retry-After: 60
```

When rate limited (429), respect the `Retry-After` header before retrying.

---

## Pagination

When retrieving paginated results, always navigate sequentially (page 1, then 2, 3, etc.). Jumping to arbitrary pages may return inconsistent results.

Use the `has_more` flag to know when to stop:

```
GET /search?q=nature&page=1&per_page=50
GET /search?q=nature&page=2&per_page=50
GET /search?q=nature&page=3&per_page=50
```

---

## Data Types

### Video

```typescript
{
  id: string;                    // Unique video identifier
  title: string;                 // Video title
  description: string;           // Long-form description
  duration: number;              // Duration in seconds
  width: number;                 // Video width in pixels
  height: number;                // Video height in pixels
  url: string;                   // Preview/watermarked URL
  thumbnail: string;             // Thumbnail image URL
  creator: Creator;              // Creator metadata
  location: Location;            // Location metadata
  content_tier: string;          // Licensing tier
  created_at: string;            // ISO 8601 timestamp
  is_featured: boolean;          // Featured/curated flag
  keywords: string[];            // Associated keywords
}
```

### Creator

```typescript
{
  name: string;                  // Creator full name
  username: string;              // Creator handle
  bio: string;                   // Creator biography
  profile_image: string;         // Profile image URL
}
```

### Location

```typescript
{
  city: string;                  // City name
  region: string;                // State/province code
  country_code: string;          // ISO 3166-1 alpha-2 code
}
```

---

## API Base URL

**Production:** `https://api.gridbank.io`

Example: `GET https://api.gridbank.io/search?q=test`

---

## OpenAPI Specification

The full OpenAPI 3.0.3 specification is available in multiple formats:

### Interactive Explorer

[**Open OpenAPI Explorer →**](openapi-viewer.html) — Explore endpoints, view schemas, and test requests in your browser.

### Download Specification

Download the specification file to import into other tools:

- [openapi.yaml](assets/openapi.yaml) — YAML format
- Production URL: `https://api.gridbank.io/openapi.json`

### Import Into Tools

Use the specification with:
- **Postman** — Import the YAML file to create a collection
- **Insomnia** — Import as OpenAPI 3.0.3
- **APIdog** — Import for interactive testing
- **Thunder Client** — Import as OpenAPI spec

---

## Support

- **Documentation:** [api.gridbank.io/docs](https://api.gridbank.io/docs)
- **Email:** hello@gridbank.io
- **Status:** [gridbank.io](https://gridbank.io)
