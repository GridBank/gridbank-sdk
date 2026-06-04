# JavaScript SDK Installation

## Requirements

- Node.js 14+ (or modern browser with ES2020 support)
- npm or yarn package manager

## Install from npm

```bash
npm install @gridbank/api-js
```

## Install with Yarn

```bash
yarn add @gridbank/api-js
```

## Install with pnpm

```bash
pnpm add @gridbank/api-js
```

## Verify Installation

```javascript
import { GridbankClient } from '@gridbank/api-js';
console.log('✓ @gridbank/api-js installed');
```

## Browser Usage

For browser environments, use a bundler like webpack, esbuild, or Vite:

```javascript
// Your code will be bundled for browser
import { GridbankClient } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });
```

## TypeScript Support

Full TypeScript types are included:

```typescript
import { GridbankClient, SearchResult } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });
const results: SearchResult = await client.searchVideos({ q: 'nature' });
```

## Development Installation

To contribute to the SDK:

```bash
git clone https://github.com/gridbank/gridbank-api-js.git
cd gridbank-api-js
npm install
npm run build
```

## Next Step

Once installed, proceed to [Client Setup](client.md).
