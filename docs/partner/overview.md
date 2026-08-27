# Partner API

Read and download the videos your GridBank account has licensed, from your own tools.

This is a different product from the [main GridBank API](../index.md), which serves leased
collections to enterprise contracts. The Partner API serves **your own library** — the clips
your account has already paid for — and uses a different credential.

## Getting a key

Create one at [gridbank.io/account/api-keys](https://gridbank.io/account/api-keys). The secret
is shown once, at creation. Store it in a secret manager, not in your repository.

On a team account, only the team owner can create keys.

## Authentication

Every request carries the key as a bearer token.

```
Authorization: Bearer apik_<id>.<secret>
```

Base URL: `https://api2.gridbank.io/partner/v1`

Keys do not expire. Revoke one from the same page and it stops working immediately.

## What you can see

The videos your account has licensed, plus those licensed by your team owner. A video you
have **not** licensed returns `403`, even though it exists on GridBank.

Listing and downloading agree: if a clip appears in your content list, you can download it.

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
      "content_tier": 0,
      "purchased_at": 1756200000,
      "preview_url": "https://.../watermarked.mp4",
      "thumbnail_url": "https://.../watermarked.jpg",
      "creator": { "id": "crea_9", "username": "jdoe", "name": "J. Doe" }
    }
  ],
  "next_cursor": "eyJvZmZzZXQiOiA1MH0="
}
```

Newest purchase first. Pass `next_cursor` back as `cursor` for the next page; no
`next_cursor` means you have reached the end. `per_page` accepts 1–100.

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
| `422` | Invalid parameter, e.g. `per_page` above 100 |

## Python

```bash
pip install gridbank-api
```

```python
from gridbank_api.partner import GridBankClient, NotLicensed

client = GridBankClient(api_key="apik_...")

# Pages are fetched as you consume them.
for video in client.content():
    print(video.video_key, video.title)

# Handles the five-minute expiry for you, and streams to disk.
try:
    client.download("video_019b12...", "clip.mp4")
except NotLicensed:
    print("not licensed by this account")
```

`download()` writes to a temporary file and moves it into place, so an interrupted
transfer never leaves a truncated file that looks complete. If the signed URL expires
between being issued and used, it requests a fresh one and retries once.

## JavaScript / TypeScript

```bash
npm install @gridbank/api-js
```

```ts
import { GridBankClient, NotLicensed } from "@gridbank/api-js/partner";

const client = new GridBankClient({ apiKey: "apik_..." });

// Pages are fetched as you consume them.
for await (const video of client.content()) {
  console.log(video.video_key, video.title);
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

## Machine-to-machine traffic

Requests are made by servers, not browsers. Send a `User-Agent` identifying your
application — GridBank's edge protection classifies unidentified automated traffic.

## Interactive reference

The full OpenAPI specification is served from the API itself and always matches what is
deployed:

- [https://api2.gridbank.io/partner/v1/docs](https://api2.gridbank.io/partner/v1/docs)
- [https://api2.gridbank.io/partner/v1/openapi.json](https://api2.gridbank.io/partner/v1/openapi.json)
