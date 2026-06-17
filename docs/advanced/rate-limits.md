# Rate Limiting

The GridBank API enforces rate limits based on your subscription tier. When you hit a rate limit, the API returns a **429 Too Many Requests** response.

## Rate Limits by Tier

| Tier | Requests/Second | Burst | Monthly Quota |
|------|-----------------|-------|---------------|
| **Starter** | 50 | 500 | 500,000 |
| **Growth** | 100 | 1,000 | 2,000,000 |
| **Scale** | 300 | 3,000 | 10,000,000 |
| **Enterprise** | 500 | 5,000 | 50,000,000 |

**Requests/Second** is the sustained throughput limit. **Burst** allows short spikes above that rate before throttling kicks in. **Monthly Quota** is the total request cap per billing period.

## Response Headers

Rate limit information is included on successful responses and rate limit errors:

```
X-RateLimit-Limit: 100                   # Your request limit this period
X-RateLimit-Remaining: 85                # Requests remaining in current period
X-RateLimit-Reset: 1705330800            # Unix timestamp when limit resets
```

**On 429 (rate limit exceeded):**
```
Retry-After: 1                           # Seconds to wait before retrying
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705330800
```

## Handling 429 Responses

When rate limited, always respect the `Retry-After` header:

=== "Python"

    ```python
    import time
    from gridbank_api import GridbankAPIError

    try:
        results = client.search_videos(q="test")
    except GridbankAPIError as e:
        if e.status_code == 429:
            time.sleep(1)  # Respect Retry-After; default to 1s if header unavailable
            results = client.search_videos(q="test")
    ```

=== "JavaScript"

    ```javascript
    try {
      const results = await client.searchVideos({ q: 'test' });
    } catch (error) {
      if (error instanceof GridbankAPIError && error.statusCode === 429) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const results = await client.searchVideos({ q: 'test' });
      }
    }
    ```

## Built-in Retry with Exponential Backoff

Both SDKs automatically retry on 429 responses using exponential backoff, respecting the `Retry-After` header. The default is **3 attempts** (1 initial + 2 retries).

=== "Python"

    ```python
    # Default: 3 attempts
    client = GridbankClient(api_key="apik_...")

    # Custom retry count
    client = GridbankClient(api_key="apik_...", max_retries=5)
    ```

=== "JavaScript"

    ```javascript
    // Default: 3 attempts
    const client = new GridbankClient({ apiKey: 'apik_...' });

    // Custom retry count
    const client = new GridbankClient({ apiKey: 'apik_...', maxRetries: 5 });
    ```

To disable retries entirely, set `max_retries=1` (Python) or `maxRetries: 1` (JavaScript).

## Monitoring Your Usage

Check your rate limit usage before making large requests:

=== "Python"

    ```python
    usage = client.usage_summary()
    print(f"Tier: {usage.tier}")
    print(f"Downloads this period: {usage.downloads_this_period}")
    print(f"Period ends: {usage.lease_period_end}")
    ```

=== "JavaScript"

    ```javascript
    const usage = await client.usageSummary();
    console.log(`Tier: ${usage.tier}`);
    console.log(`Downloads this period: ${usage.downloads_this_period}`);
    console.log(`Period ends: ${usage.lease_period_end}`);
    ```

## Best Practices

1. **Check before you make requests** — Use response headers to know your remaining quota
2. **Batch operations during off-peak** — Schedule large batch jobs when traffic is lower
3. **Rely on built-in retries** — Both SDKs retry automatically with exponential backoff; increase `max_retries` for large batch jobs
4. **Monitor trends** — Track your usage over time; upgrade if you consistently hit limits
5. **Cache results** — Cache video metadata if you query the same videos repeatedly
6. **Use appropriate page sizes** — Larger page sizes (per_page=80) reduce total requests

## Upgrading Your Tier

- **Starter** → **Growth** → **Scale** → **Enterprise**

Contact [support@gridbank.io](mailto:support@gridbank.io) to upgrade or discuss enterprise plans.

## Rate Limit Errors

| Error | Meaning | Solution |
|-------|---------|----------|
| 429 Too Many Requests | Sustained rate limit exceeded | Wait for `Retry-After` seconds and retry |
| X-RateLimit-Remaining: 0 | No requests left this period | Wait for X-RateLimit-Reset |

---

**Rule of thumb:** If you hit rate limits regularly, it's time to upgrade your plan.
