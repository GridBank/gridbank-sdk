# Partner API

Search the GridBank catalog, and read and download the videos your GridBank account has
licensed, from your own tools.

## Getting a key

Create one from your account settings on gridbank.io. Every key takes a name, so
give it one that says where it runs. The secret is shown once, at creation. Store
it in a secret manager, not in your repository.

Any member of a team account can create their own key, up to **10** at a time — one
per service or environment. Revoke a key to free the slot.

## Authentication

Every request carries the key as a bearer token.

```
Authorization: Bearer apik_<id>.<secret>
```

Base URL: `https://api2.gridbank.io/partner/v1`

Keys do not expire. Revoke one from the same page and it stops working immediately.

## Replacing a key

There is no rotate endpoint. Because you can hold several keys at once, replace one
without downtime by overlapping them:

1. Create a new key from your account settings.
2. Deploy the new secret.
3. Revoke the old key once nothing uses it.

The old key keeps working until you revoke it, so there is no deadline to race and no
window where both are unusable.

If you are already holding all 10, revoke a key you are not using to free a slot first.
Should every slot be genuinely in use, revoke the one you are replacing and create its
replacement straight after — that service is down for the seconds in between, which is
why it is worth keeping a slot spare.

## What you can see

The videos your account has licensed, plus those licensed by your team owner. A video you
have **not** licensed returns `403`, even though it exists on GridBank.

Listing and downloading agree: if a clip appears in your content list, you can download it.

Search is different: it covers the whole catalog, with the same results and ranking as
gridbank.io, including videos you have not licensed. A search hit is a watermarked preview,
not a licence — downloading one you have not licensed still returns `403`.

## Endpoints

### List licensed content

```
GET /partner/v1/content?per_page=50
```

```json
{
  "videos": [
    {
      "video_key": "video_019b12...",
      "title": "Aerial coastline",
      "duration_seconds": 12.4,
      "purchased_at": 1756200000,
      "preview_url": "https://.../watermarked.mp4",
      "thumbnail_url": "https://.../watermarked.jpg",
      "creator": { "id": "crea_9", "username": "jdoe", "name": "J. Doe" }
    }
  ],
  "next_cursor": "eyJvZmZ..."
}
```

Newest purchase first. Pass `next_cursor` back as `cursor` for the next page; no
`next_cursor` means you have reached the end. `per_page` accepts 1–100.

Treat the cursor as opaque — pass it back unchanged. Its encoding is an implementation
detail and may change.

### Search the catalog

```
POST /partner/v1/search
Content-Type: application/json
```

```json
{
  "query": "aerial coastline",
  "page": 0,
  "items": 50,
  "sort": "relevant",
  "location": "Lisbon, Lisboa, PRT",
  "duration_gte": 4,
  "duration_lte": 30
}
```

Only `query` is required: 1–200 characters, surrounding whitespace trimmed. The rest:

| Field | Values | Default |
|---|---|---|
| `page` | 0–199, zero-based | `0` |
| `items` | 1–50 | `50` |
| `sort` | `relevant`, `popular` or `recent` | ranking as on gridbank.io |
| `location` | up to 200 characters, see below | no filter |
| `duration_gte` | seconds, 4–30 | `4` |
| `duration_lte` | seconds, 4–30, not below `duration_gte` | `30` |

Leave a field out to get its default — `null` is not accepted for the durations, and
unknown fields are rejected with `422`.

`location` is comma-separated, e.g. `"Lisbon, Lisboa, PRT"`, `"Lisbon"` or `"PRT"`. A 2- or
3-letter ISO country code matches the video's country exactly, so write the code, not the
name: `"PRT"`, not `"Portugal"`. Any other part matches the video's city or region as a
case-insensitive substring. A video matches if any part matches. Blank means no filter.

```json
{
  "videos": [
    {
      "video_key": "video_019b12...",
      "title": "Aerial coastline",
      "duration_seconds": 12.4,
      "width_pixels": 1080,
      "height_pixels": 1920,
      "preview_url": "https://.../watermarked.mp4",
      "thumbnail_url": "https://.../watermarked.jpg",
      "creator": { "id": "crea_9", "username": "jdoe", "name": "J. Doe" }
    }
  ],
  "has_more": true,
  "search_id": "6f1d2c..."
}
```

Request the next `page` while `has_more` is true. A page can hold fewer than `items`
results without being the last, so page on `has_more`, not on a short page. `has_more` is
false on page 199, the last one available.

There is no `purchased_at` and no download URL on a hit. `search_id` identifies the
search; quote it if you contact us about a result.

### Get a download URL

```
GET /partner/v1/videos/{video_key}/download
```

```json
{
  "video_key": "video_019b12...",
  "url": "https://s3.amazonaws.com/...",
  "expires_at": 1756200300
}
```

The URL is valid for **five minutes** and serves the master file, without a watermark.
Fetch it straight away rather than storing it — request a new one whenever you need it,
as often as you like. There is no charge for re-issuing.

## Errors

| Status | Meaning |
|---|---|
| `401` | Key missing, malformed, or revoked |
| `403` | You have not licensed this video |
| `404` | No video with that key |
| `400` | Malformed cursor — restart paging from the beginning |
| `422` | Invalid parameter, e.g. `per_page` above 100, or an unknown search field |
| `429` | Rate limited — retry after the `Retry-After` header |

## SDK field names

Both SDKs return `Video` and `Creator` objects, so a few fields are read under
different names than the JSON above:

| Response field | SDK field |
|---|---|
| `video_key` | `video.id` |
| `duration_seconds` | `video.duration` |
| `preview_url` | `video.url` |
| `thumbnail_url` | `video.thumbnail` |
| `width_pixels` | `video.width` |
| `height_pixels` | `video.height` |
| `purchased_at` | `video.purchased_at` (Python) / `video.purchasedAt` (JS) |

Search hits leave `purchased_at` unset, and listed content leaves `width` and `height`
unset. `Video` carries other fields the Partner API does not return - `description`,
`location`, `keywords` - which are always unset here.

Both SDKs page search for you and yield videos only; `search_id` is not exposed.

## Python

```bash
pip install gridbank-api
```

```python
from gridbank_api import PartnerClient, NotLicensed

client = PartnerClient(api_key="apik_...")

# Pages are fetched as you consume them.
for video in client.content():
    print(video.id, video.title)

# Searches the whole catalog, licensed or not; pages until has_more is false.
for video in client.search("aerial coastline", location="Lisbon, PRT", duration_lte=15):
    print(video.id, video.url)  # a watermarked preview

# Handles the five-minute expiry for you, and streams to disk.
try:
    client.download("video_019b12...", "clip.mov")
except NotLicensed:
    print("not licensed by this account")
```

`download()` writes to a temporary file and moves it into place, so an interrupted
transfer never leaves a truncated file that looks complete. If the signed URL expires
between being issued and used, it requests a fresh one and retries once.

You choose the destination path, so you choose the extension. Masters are usually
QuickTime (`.mov`), but the format is a property of what the creator uploaded and is not
returned by `/content`. The signed URL's `response-content-disposition` carries the real
filename if you need it - read it from the URL, or from the `Content-Disposition` header
on the download response.

## JavaScript / TypeScript

```bash
npm install @gridbank/api-js
```

```ts
import { PartnerClient, NotLicensed } from "@gridbank/api-js";

const client = new PartnerClient({ apiKey: "apik_..." });

// Pages are fetched as you consume them.
for await (const video of client.content()) {
  console.log(video.id, video.title);
}

// Searches the whole catalog, licensed or not; pages until has_more is false.
for await (const video of client.search("aerial coastline", {
  location: "Lisbon, PRT",
  durationLte: 15,
})) {
  console.log(video.id, video.url); // a watermarked preview
}

try {
  const response = await client.fetchDownload("video_019b12...");
  // Node: pipe response.body to a file. Browser: await response.blob().
} catch (err) {
  if (err instanceof NotLicensed) {
    console.log("not licensed by this account");
  }
}
```

`fetchDownload()` returns the `Response` rather than writing to a path — this package runs
in browsers as well as Node, and only you know where the bytes should go. It handles the
five-minute expiry: a stale URL is re-requested once before it gives up.

## Revoked access

GridBank can withdraw an account's Partner API access. When that happens every request
returns `403` with the code `partner_access_revoked`, and both clients raise
`AccessRevoked` rather than `NotLicensed` — the key is valid and the videos are still
licensed, so retrying or minting a new key will not help. Get in touch with us instead.

## Rate limits

300 requests per minute, counted per account. Over that, requests are rejected
with `429` and a `Retry-After` header giving the seconds to wait. Both clients
retry `429` for you and honour that header — see `max_retries` / `maxRetries`.

The limit follows the account, not the key, so splitting work across keys does not
raise your total: budget the account. Keys exist to separate and revoke credentials
per service, not to buy throughput.

## Machine-to-machine traffic

Requests are made by servers, not browsers. Send a `User-Agent` identifying your
application — GridBank's edge protection classifies unidentified automated traffic.

## Interactive reference

The full OpenAPI specification is served from the API itself and always matches what is
deployed:

- [https://api2.gridbank.io/partner/v1/docs](https://api2.gridbank.io/partner/v1/docs)
- [https://api2.gridbank.io/partner/v1/openapi.json](https://api2.gridbank.io/partner/v1/openapi.json)
