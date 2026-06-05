# GridBank SDK

Official Python and JavaScript SDKs for the GridBank External API.

**Documentation:** https://automatic-meme-y7g41eg.pages.github.io/ (temporary) → will move to custom domain when ready

## Packages

| Language | Package | Status |
|----------|---------|--------|
| Python | `gridbank-api` | Coming soon |
| JavaScript | `@gridbank/api-js` | Coming soon |

## Quick Start

**Python**
```bash
pip install gridbank-api
```
```python
from gridbank_api import GridbankClient

client = GridbankClient(api_key="apik_...")
results = client.search_videos(q="nature", per_page=10)
```

**JavaScript**
```bash
npm install @gridbank/api-js
```
```javascript
import { GridbankClient } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });
const results = await client.searchVideos({ q: 'nature', per_page: 10 });
```

## Publishing

**Python** — tag `python/v<version>` to trigger PyPI publish via GitHub Actions.

**JavaScript** — tag `js/v<version>` to trigger npm publish via GitHub Actions. Requires `NPM_TOKEN` secret.

Before publishing, set up PyPI trusted publishing for this repo at https://pypi.org/manage/account/publishing/.

## Docs Development

The docs are built with MkDocs and Material theme.

**Local preview:**
```bash
pip install -r requirements.txt
mkdocs serve
```

**Auto-deployment:** Push to `master` → GitHub Actions builds and deploys to GitHub Pages automatically.
