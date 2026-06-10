# Error Handling

All GridBank API responses use standard HTTP status codes. Non-2xx responses include a JSON error envelope.

## Error Response Format

### Standard Error (4xx, 5xx)

```json
{
  "detail": "Human-readable error message"
}
```

### Validation Error (422)

```json
{
  "detail": [
    {
      "loc": ["query", "per_page"],
      "msg": "Input should be less than or equal to 80",
      "type": "less_than_equal"
    }
  ]
}
```

## HTTP Status Codes

| Code | Name | Meaning | Action |
|------|------|---------|--------|
| **400** | Bad Request | Malformed request or invalid parameters | Fix request, retry |
| **401** | Unauthorized | Missing or invalid Bearer token | Verify API key, regenerate if needed |
| **403** | Forbidden | No active subscription for this operation | Upgrade subscription plan |
| **404** | Not Found | Video ID or resource does not exist | Check resource ID, search first |
| **422** | Validation Error | Invalid input data (see detail array) | Review field errors, fix input |
| **429** | Too Many Requests | Rate limit exceeded | Wait and retry (see Retry-After header) |
| **500** | Internal Server Error | Server-side error (temporary) | Retry after delay |

## Common Errors

### 401 Unauthorized

**Cause:** Missing or invalid Bearer token

**Solution:**
- Verify `Authorization: Bearer` header is present in all requests
- Confirm API key is correct and not expired
- Regenerate key if compromised

=== "Python"

    ```python
    from gridbank_api import GridbankClient, GridbankAPIError

    client = GridbankClient(api_key="invalid_key")
    try:
        results = client.search_videos(q="test")
    except GridbankAPIError as e:
        if e.code == "unauthorized":
            print("API key is invalid. Check your credentials.")
    ```

=== "JavaScript"

    ```javascript
    const client = new GridbankClient({ apiKey: 'invalid_key' });
    try {
      await client.searchVideos({ q: 'test' });
    } catch (error) {
      if (error.code === 'unauthorized') {
        console.error('API key is invalid.');
      }
    }
    ```

### 403 Forbidden

**Cause:** Account lacks subscription for this operation

**Solution:**
- Upgrade to a plan that includes video downloads
- Verify subscription is active (check usage_summary())
- Contact support@gridbank.io if you believe this is an error

=== "Python"

    ```python
    try:
        download = client.download_video(video_id="video_abc123")
    except GridbankAPIError as e:
        if e.code == "forbidden":
            print("You need an active subscription to download videos.")
            usage = client.usage_summary()
            print(f"Current tier: {usage.tier}")
    ```

=== "JavaScript"

    ```javascript
    try {
      const download = await client.downloadVideo('video_abc123');
    } catch (error) {
      if (error.code === 'forbidden') {
        console.error('You need an active subscription to download videos.');
        const usage = await client.usageSummary();
        console.log(`Current tier: ${usage.tier}`);
      }
    }
    ```

### 404 Not Found

**Cause:** Video ID does not exist

**Solution:**
- Use search_videos() first to find valid video IDs
- Confirm video ID format (alphanumeric, hyphens, underscores)
- Check if video has been removed from library

=== "Python"

    ```python
    try:
        video = client.get_video(video_id="invalid_id")
    except GridbankAPIError as e:
        if e.code == "not_found":
            print("Video not found. Search for videos first:")
            results = client.search_videos(q="nature")
    ```

=== "JavaScript"

    ```javascript
    try {
      const video = await client.getVideo('invalid_id');
    } catch (error) {
      if (error.code === 'not_found') {
        console.error('Video not found. Searching instead:');
        const results = await client.searchVideos({ q: 'nature' });
      }
    }
    ```

### 422 Validation Error

**Cause:** Invalid input data (e.g., per_page > 80)

**Solution:**
- Review the detail array for which field failed
- Adjust parameter values to match constraints
- Common issues:
  - `per_page` must be 1–80
  - `page` must be > 0
  - `q` must be 1–200 characters
  - `expires_in` must be 1–5 minutes

=== "Python"

    ```python
    try:
        results = client.search_videos(q="test", per_page=200)
    except GridbankAPIError as e:
        if e.code == "validation_error":
            for error in e.details:
                print(f"Field {error['loc']}: {error['msg']}")
    ```

=== "JavaScript"

    ```javascript
    try {
      const results = await client.searchVideos({ q: 'test', perPage: 200 });
    } catch (error) {
      if (error.code === 'validation_error') {
        error.details.forEach(err => {
          console.error(`Field ${err.loc.join('.')}: ${err.msg}`);
        });
      }
    }
    ```

### 429 Rate Limited

**Cause:** Too many requests in a short period

**Solution:**
- Respect the `Retry-After` response header
- Implement exponential backoff (1s, 2s, 4s, 8s...)
- Reduce request frequency
- Upgrade to higher tier for increased limits

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
            if e.code == "rate_limited":
                wait_time = (2 ** attempt)  # exponential backoff
                print(f"Rate limited. Retrying in {wait_time}s...")
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
          if (error.code === 'rate_limited') {
            const waitTime = Math.pow(2, attempt) * 1000;
            console.log(`Rate limited. Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            throw error;
          }
        }
      }
    }
    ```

### 500 Internal Server Error

**Cause:** Temporary server-side issue

**Solution:**
- Retry the request after a short delay
- Check [gridbank.io](https://gridbank.io) for incidents
- Contact support@gridbank.io if errors persist

## Error Class Reference

### Python

```python
class GridbankAPIError(Exception):
    code: str          # Error code (e.g., "unauthorized")
    message: str       # Human-readable message
    details: Any       # Optional field-level details
    status_code: int   # HTTP status code
```

### JavaScript

```typescript
class GridbankAPIError extends Error {
    code: string;      // Error code
    message: string;   // Human-readable message
    details: any;      // Optional field-level details
    statusCode: number; // HTTP status code
}
```

## Support

Need help? Contact support@gridbank.io with:
- Error code and message
- API key prefix (apik_xxxx)
- Request details (endpoint, parameters)
- Timestamp of error
