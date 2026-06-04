# @gridbank/api-js

Official JavaScript/TypeScript SDK for the GridBank API.

**Docs:** https://gridbank.github.io/gridbank-sdk/javascript.html

## Install

```bash
npm install @gridbank/api-js
```

## Usage

```javascript
import { GridbankClient } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });

const results = await client.searchVideos({ q: 'nature', per_page: 10 });
for (const video of results.videos) {
  console.log(video.title);
}
```
