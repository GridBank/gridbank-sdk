# JavaScript SDK Installation

Get the GridBank JavaScript SDK installed and ready to use in your Node.js or browser project.

## Requirements

- **Node.js:** 14 or later (for Node.js environments)
- **Browser:** Modern browser with ES2020 support
- **Package Manager:** npm, yarn, or pnpm

## Quick Install

Install the SDK from npm:

```bash
npm install @gridbank/api-js
```

## Install with Other Package Managers

**Yarn:**
```bash
yarn add @gridbank/api-js
```

**pnpm:**
```bash
pnpm add @gridbank/api-js
```

## Verify Installation

Check that the SDK is installed correctly:

```javascript
import { GridbankClient } from '@gridbank/api-js';
console.log('✓ @gridbank/api-js installed');
```

## Node.js Usage

Use the SDK in your Node.js applications:

```javascript
import { GridbankClient } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });
const results = await client.searchVideos({ q: 'nature' });
```

## Browser Usage

Use with a bundler like Webpack, Vite, or esbuild for browser environments:

```javascript
import { GridbankClient } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });
const results = await client.searchVideos({ q: 'nature' });
```

## TypeScript Support

Full TypeScript types are included. No extra installation needed:

```typescript
import { GridbankClient, SearchResult } from '@gridbank/api-js';

const client = new GridbankClient({ apiKey: 'apik_...' });
const results: SearchResult = await client.searchVideos({ q: 'nature' });
```

## Development Installation

To contribute or modify the SDK:

```bash
git clone https://github.com/gridbank/gridbank-api-js.git
cd gridbank-api-js
npm install
npm run build
```

## Troubleshooting

**Module not found:** Ensure you've run `npm install @gridbank/api-js` in your project directory.

**TypeScript errors:** Make sure your `tsconfig.json` targets ES2020 or later (`"target": "ES2020"`).

## Next Steps

- [Client Setup](client.md) — Initialize your first client
- [Method Reference](methods.md) — Explore available methods
- [Code Examples](examples.md) — Learn by example
- [Error Handling](../api-reference.md#error-codes) — Handle errors gracefully
