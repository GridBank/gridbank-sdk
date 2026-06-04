# Getting Started

## 1. Get Your API Key

1. Sign up or log in at [gridbank.io](https://gridbank.io)
2. Navigate to **Settings** → **API Keys**
3. Click **Create New Key** and copy the generated key (starts with `apik_`)
4. Keep this key secure; never commit it to version control

## 2. Choose Your SDK

GridBank provides official SDKs for Python and JavaScript:

=== "Python"

    ```bash
    pip install gridbank-api
    ```

    Works with Python 3.8+

=== "JavaScript"

    ```bash
    npm install @gridbank/api-js
    ```

    Requires Node.js 14+ or modern browser with ES2020 support

## 3. Make Your First Request

=== "Python"

    ```python
    from gridbank_api import GridbankClient

    # Initialize client
    client = GridbankClient(api_key="apik_your_key_here")

    # Search for videos
    results = client.search_videos(q="nature", per_page=5)
    
    for video in results.videos:
        print(f"{video.title} ({video.duration}s)")
    ```

=== "JavaScript"

    ```javascript
    import { GridbankClient } from '@gridbank/api-js';

    // Initialize client
    const client = new GridbankClient({ apiKey: 'apik_your_key_here' });

    // Search for videos
    const results = await client.searchVideos({ q: 'nature', perPage: 5 });
    
    results.videos.forEach(video => {
      console.log(`${video.title} (${video.duration}s)`);
    });
    ```

## 4. Handle Errors

All SDK methods raise exceptions on non-2xx responses. Always wrap API calls in try-catch:

=== "Python"

    ```python
    from gridbank_api import GridbankClient, GridbankAPIError

    client = GridbankClient(api_key="apik_...")

    try:
        results = client.search_videos(q="test")
    except GridbankAPIError as e:
        print(f"Error {e.code}: {e.message}")
        if e.details:
            print(f"Details: {e.details}")
    ```

=== "JavaScript"

    ```javascript
    const client = new GridbankClient({ apiKey: 'apik_...' });

    try {
      const results = await client.searchVideos({ q: 'test' });
    } catch (error) {
      if (error.code) {
        console.error(`Error ${error.code}: ${error.message}`);
      } else {
        console.error('Unexpected error:', error);
      }
    }
    ```

## 5. Check Your Usage

Monitor your subscription tier and remaining quota:

=== "Python"

    ```python
    usage = client.usage_summary()
    print(f"Tier: {usage.tier}")
    print(f"Downloads used: {usage.downloads_this_period}")
    print(f"Period ends: {usage.lease_period_end}")
    ```

=== "JavaScript"

    ```javascript
    const usage = await client.usageSummary();
    console.log(`Tier: ${usage.tier}`);
    console.log(`Downloads used: ${usage.downloads_this_period}`);
    console.log(`Period ends: ${usage.lease_period_end}`);
    ```

## Subscription Tiers

| Tier | Monthly Limit | Rate Limit | Support |
|------|---------------|-----------|---------|
| **Starter** | 100 downloads | 10 req/min | Community |
| **Pro** | 1,000 downloads | 60 req/min | Email |
| **Enterprise** | Unlimited | Custom | Priority |

## Next Steps

- Explore the [Python SDK](python/overview.md) or [JavaScript SDK](javascript/overview.md)
- Check the [API Reference](api-reference.md) for endpoint details
- Review [Error Handling](errors.md) for common issues
- See [Rate Limits](advanced/rate-limits.md) for quota information

## Support

Stuck? Reach out:

- **Email:** support@gridbank.io
- **Status Page:** [status.gridbank.io](https://status.gridbank.io)
- **GitHub Issues:** [gridbank/gridbank-external-api/issues](https://github.com/gridbank/gridbank-external-api/issues)
