# Rate Limiting

The GridBank API enforces rate limits based on your subscription tier. When you hit a rate limit, the API returns a **429 Too Many Requests** response.

## Rate Limits by Tier

| Tier | Requests/Minute | Concurrent | Burst | Notes |
|------|-----------------|-----------|-------|-------|
| **Starter** | 10 | 2 | 15 | For development and testing |
| **Growth** | 60 | 5 | 80 | For production applications |
| **Enterprise** | Custom | Custom | Custom | Contact sales@gridbank.io |

## Response Headers

Rate limit information is included on successful responses and rate limit errors:

```
X-RateLimit-Limit: 60                    # Your request limit this period
X-RateLimit-Remaining: 45                # Requests remaining in current period
X-RateLimit-Reset: 1705330800            # Unix timestamp when limit resets
```

**On 429 (rate limit exceeded):**
```
Retry-After: 60                          # Seconds to wait before retrying
X-RateLimit-Limit: 60
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
        if e.code == "rate_limited":
            # Check Retry-After header in the response
            retry_after = e.retry_after or 60  # Default to 60 seconds
            print(f"Rate limited. Waiting {retry_after}s...")
            time.sleep(retry_after)
            results = client.search_videos(q="test")  # Retry
    ```

=== "JavaScript"

    ```javascript
    try {
      const results = await client.searchVideos({ q: 'test' });
    } catch (error) {
      if (error.code === 'rate_limited') {
        const retryAfter = error.retryAfter || 60;
        console.log(`Rate limited. Waiting ${retryAfter}s...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        const results = await client.searchVideos({ q: 'test' });
      }
    }
    ```

## Automatic Retries

The SDKs include built-in exponential backoff for 429 responses:

=== "Python"

    ```python
    # Automatically retries with exponential backoff
    client = GridbankClient(
        api_key="apik_...",
        max_retries=3  # Try up to 3 times
    )
    
    # If rate limited, SDK retries automatically
    results = client.search_videos(q="nature")
    ```

=== "JavaScript"

    ```javascript
    // Automatically retries with exponential backoff
    const client = new GridbankClient({
      apiKey: 'apik_...',
      maxRetries: 3  // Try up to 3 times
    });
    
    // If rate limited, SDK retries automatically
    const results = await client.searchVideos({ q: 'nature' });
    ```

## Manual Retry with Exponential Backoff

Implement your own retry logic:

=== "Python"

    ```python
    import time
    from gridbank_api import GridbankAPIError

    max_retries = 3
    for attempt in range(max_retries):
        try:
            results = client.search_videos(q="test")
            break
        except GridbankAPIError as e:
            if e.code == "rate_limited" and attempt < max_retries - 1:
                wait_time = 2 ** attempt  # 1s, 2s, 4s...
                print(f"Rate limited. Waiting {wait_time}s...")
                time.sleep(wait_time)
            else:
                raise
    ```

=== "JavaScript"

    ```javascript
    async function searchWithRetry(query, maxRetries = 3) {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await client.searchVideos({ q: query });
        } catch (error) {
          if (error.code === 'rate_limited' && attempt < maxRetries - 1) {
            const waitTime = Math.pow(2, attempt) * 1000;  // 1s, 2s, 4s...
            console.log(`Rate limited. Waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            throw error;
          }
        }
      }
    }

    const results = await searchWithRetry('nature');
    ```

## Monitoring Your Usage

Check your rate limit usage before making large requests:

=== "Python"

    ```python
    usage = client.usage_summary()
    print(f"Tier: {usage.tier}")
    
    tier_limits = {
        "starter": 10,
        "growth": 60,
        "enterprise": float('inf')
    }
    
    limit = tier_limits.get(usage.tier, 0)
    print(f"Your rate limit: {limit} requests/minute")
    ```

=== "JavaScript"

    ```javascript
    const usage = await client.usageSummary();
    console.log(`Tier: ${usage.tier}`);
    
    const tierLimits = {
      'starter': 10,
      'growth': 60,
      'enterprise': Infinity
    };
    
    const limit = tierLimits[usage.tier];
    console.log(`Your rate limit: ${limit} requests/minute`);
    ```

## Best Practices

1. **Check before you make requests** — Use response headers to know your remaining quota
2. **Batch operations during off-peak** — Schedule large batch jobs when traffic is lower
3. **Implement backoff** — Use exponential backoff (1s, 2s, 4s, 8s...) when retrying
4. **Monitor trends** — Track your usage over time; upgrade if you consistently hit limits
5. **Cache results** — Cache video metadata if you query the same videos repeatedly
6. **Use appropriate page sizes** — Larger page sizes (per_page=80) reduce total requests

## Upgrading Your Tier

Rate limit too low? Upgrade your subscription:

- **Starter** (10 req/min) → **Growth** (60 req/min)
- **Growth** (60 req/min) → **Enterprise** (custom)

Upgrade at [gridbank.io/billing](https://gridbank.io/billing) or contact sales@gridbank.io for enterprise plans.

## Rate Limit Errors

Common rate limit errors:

| Error | Meaning | Solution |
|-------|---------|----------|
| 429 Too Many Requests | You've exceeded your quota | Wait and retry after Retry-After |
| X-RateLimit-Remaining: 0 | No requests left this period | Wait for X-RateLimit-Reset |
| Burst limit exceeded | Too many concurrent requests | Reduce concurrent connections |

---

**Rule of thumb:** If you hit rate limits regularly, it's time to upgrade your plan.
