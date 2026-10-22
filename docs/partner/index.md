# Partner API

Search the GridBank catalog, license videos, and read and download the videos your
GridBank account has licensed, from your own tools.

## Getting a key

Create one from your account settings on gridbank.io. Every key takes a name, so
give it one that says where it runs. The secret is shown once, at creation. Store
it in a secret manager, not in your repository.

Any member of a team account can create their own key, up to **10** at a time — one
per service or environment. Revoke a key to free the slot.

Choose the key's access when you create it:

| Access | Can |
|---|---|
| Read only (default) | Search, list and download videos your account has licensed |
| Read & license | All of the above, and license new videos — each uses one download from your plan |

A key handed to a read-only integration can never spend downloads.

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

Search is different: it covers the whole catalog with the same search and ranking as
gridbank.io, limited to clips of 4 to 30 seconds, including videos you have not licensed. A search hit is a watermarked preview,
not a licence — downloading one you have not licensed still returns `403`. License it
first with a key that has license access.

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

`location` is comma-separated, e.g. `"Lisbon, Lisboa, PRT"`, `"Lisbon"` or `"PRT"`, and a
video must match every part. A 2- or 3-letter ISO country code matches the video's country,
so write the code, not the name: `"PRT"`, not `"Portugal"`. Any other part must equal the
video's city or region, ignoring case, or appear in its location description. So
`"Lisbon, Lisboa, PRT"` keeps videos from Lisbon, in the Lisboa region, in Portugal. Blank
means no filter.

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
  "search_id": "3f0c9a52-7d1e-4b8a-9c6e-2a4f1d8b7e10"
}
```

Request the next `page` while `has_more` is true. A page can hold fewer than `items`
results without being the last, so page on `has_more`, not on a short page. `has_more` is
false on page 199, the last one available.

There is no `purchased_at` and no download URL on a hit. `search_id` identifies the
search; quote it if you contact us about a result.

### Search creators

```
POST /partner/v1/search/creators
Content-Type: application/json
```

```json
{
  "query": "",
  "location": null,
  "top_only": false,
  "featured_only": false,
  "favorites_only": false,
  "page": 0,
  "items": 50
}
```

Every field is optional. An empty `query` lists every creator; otherwise it matches a
creator's name or username, up to 200 characters.

| Field | Values | Default |
|---|---|---|
| `query` | up to 200 characters | `""`, every creator |
| `location` | up to 200 characters | no filter |
| `top_only` | only top creators | `false` |
| `featured_only` | only curated featured creators | `false` |
| `favorites_only` | only creators you have favourited on gridbank.io | `false` |
| `page` | 0–20, zero-based | `0` |
| `items` | 1–50 | `50` |

Unknown fields are rejected with `422`. Favourites are managed on gridbank.io and cannot
be changed through the API.

```json
{
  "creators": [
    {
      "id": "crea_9",
      "username": "jdoe",
      "name": "J. Doe",
      "image_url": "https://.../profile.jpg",
      "bio": "Drone pilot, Lisbon",
      "is_top_creator": true,
      "clips_count": 42,
      "is_favorited": false,
      "videos": [
        {
          "video_key": "video_019b12...",
          "title": "Aerial coastline",
          "duration_seconds": 12.4,
          "width_pixels": 1080,
          "height_pixels": 1920,
          "preview_url": "https://.../watermarked.mp4",
          "thumbnail_url": "https://.../watermarked.jpg"
        }
      ]
    }
  ],
  "has_more": true,
  "total_items": 318
}
```

`videos` is a selection of the creator's clips, as watermarked previews in the same shape
as catalog search hits, minus `creator`. Request the next `page` while `has_more` is true; it is false on
page 20, the last one available.

### License a video

```
POST /partner/v1/videos/{video_key}/license
```

```json
{ "search_id": "srch_01a1..." }
```

The body is optional: pass the `search_id` of the search that found the video, if any.

```json
{
  "video_key": "video_019b12...",
  "already_licensed": false,
  "downloads_remaining": 74
}
```

Licenses a catalog video with one download from your plan, exactly as downloading it on
gridbank.io would. Needs a key with license access. On a team account the download comes
from the team owner's plan. A video your account already holds is never charged again:
`already_licensed` is `true` and nothing changes, so the call is safe to retry.
`downloads_remaining` is what is left this period, `null` on unlimited plans.

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
| `403` | You have not licensed this video (`video_not_licensed`), your plan does not include the Partner API (`partner_api_not_included`), or your access was revoked (`partner_access_revoked`) |
| `404` | No video with that key (`video_not_found`) |
| `400` | Malformed cursor — restart paging from the beginning |
| `422` | Invalid parameter, e.g. `per_page` above 100, or an unknown search field |
| `429` | Rate limited — retry after the `Retry-After` header |

Errors carry a machine-readable code in `detail.error.code`. Licensing adds these:

| Status | Code | Meaning |
|---|---|---|
| `400` | `no_downloads_remaining` | This period's allowance is used up |
| `400` | `subscription_paused` | The subscription is paused or its payment is overdue |
| `400` | `subscription_expired` | The billing period has ended |
| `400` | `no_subscription` | The account has no subscription |
| `400` | `unsupported_subscription` | The account's plan cannot license videos |
| `403` | `api_key_read_only` | The key was not created with license access |
| `403` | `plan_excludes_content` | The video is above your plan's content tier |
| `403` | `inactive_team` | Your team is inactive |
| `404` | `video_not_available` | The video is not approved for licensing |

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
| `search_id` (search page) | `video.search_id` (Python) / `video.searchId` (JS) |

Search hits leave `purchased_at` unset, and listed content leaves `width` and `height`
unset. `Video` carries other fields the Partner API does not return - `description`,
`location`, `keywords` - which are always unset here.

Both SDKs page search for you and yield videos only, each carrying its page's
`search_id` so you can pass it to `license`.

## Python

```bash
pip install gridbank-api
```

```python
from gridbank_api import PartnerClient, LicenseRefused, NotLicensed

client = PartnerClient(api_key="apik_...")

# Pages are fetched as you consume them.
for video in client.content():
    print(video.id, video.title)

# Searches the whole catalog, licensed or not; pages until has_more is false.
for video in client.search("aerial coastline", location="Lisbon, PRT", duration_lte=15):
    print(video.id, video.url)  # a watermarked preview

# Needs a key with license access; uses one download unless already held.
try:
    result = client.license(video.id, search_id=video.search_id)
    print(result.downloads_remaining)
except LicenseRefused as err:
    print("cannot license:", err.code)  # e.g. no_downloads_remaining

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
import { PartnerClient, LicenseRefused, NotLicensed } from "@gridbank/api-js";

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

// Needs a key with license access; uses one download unless already held.
try {
  const result = await client.license("video_019b12...", { searchId: "srch_01a1..." });
  console.log(result.downloadsRemaining);
} catch (err) {
  if (err instanceof LicenseRefused) console.log("cannot license:", err.code);
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

An account whose plan does not include the Partner API gets `403` with the code
`partner_api_not_included` on every request, search included, and both clients raise
`PartnerApiNotIncluded`. Change the plan on gridbank.io to get access.

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
