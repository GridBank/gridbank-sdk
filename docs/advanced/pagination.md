# Pagination

When retrieving paginated results, always navigate sequentially (page 1 → 2 → 3, etc.). Jumping arbitrarily to non-sequential pages may return inconsistent results or use different backend search modes.

## Sequential Pagination

Always move through pages in order. Use the `has_more` / `hasMore` flag to know when to stop.

=== "Python"

    ```python
    page = 1
    while True:
        results = client.search_videos(
            q="nature",
            page=page,
            per_page=50
        )
        
        for video in results.videos:
            process_video(video)
        
        if not results.has_more:
            break
        page += 1
    ```

=== "JavaScript"

    ```javascript
    let page = 1;
    while (true) {
      const results = await client.searchVideos({
        q: 'nature',
        page,
        perPage: 50
      });
      
      for (const video of results.videos) {
        processVideo(video);
      }
      
      if (!results.hasMore) break;
      page++;
    }
    ```

## Page Size

Adjust `per_page` / `perPage` based on your needs (1–80 results per page).

- **Small pages (10–20):** For interactive UI with quick response times
- **Large pages (50–80):** For bulk operations and data exports

Keep the page size **consistent while paginating**. Changing it mid-pagination can cause duplicate or missing results.

=== "Python"

    ```python
    # ✓ Correct: Keep per_page consistent
    for page in range(1, 11):
        results = client.search_videos(q="test", page=page, per_page=50)
        # ... process results
    
    # ✗ Incorrect: Changing per_page mid-pagination
    for page in range(1, 11):
        per_page = 10 if page == 1 else 50  # DON'T DO THIS
        results = client.search_videos(q="test", page=page, per_page=per_page)
    ```

=== "JavaScript"

    ```javascript
    // ✓ Correct: Keep perPage consistent
    for (let page = 1; page <= 10; page++) {
      const results = await client.searchVideos({ q: 'test', page, perPage: 50 });
      // ... process results
    }
    
    // ✗ Incorrect: Changing perPage mid-pagination
    for (let page = 1; page <= 10; page++) {
      const perPage = page === 1 ? 10 : 50;  // DON'T DO THIS
      const results = await client.searchVideos({ q: 'test', page, perPage });
    }
    ```

## Use Search ID for Analytics

Each search returns a `search_id` / `searchId`. Keep this consistent across all pages from the same search to track the complete user journey:

=== "Python"

    ```python
    first_page = client.search_videos(q="nature", page=1, per_page=50)
    search_id = first_page.search_id

    # Later, download videos from this search
    download = client.download_video(
        video_id="video_xyz",
        search_id=search_id  # Track back to original search
    )
    ```

=== "JavaScript"

    ```javascript
    const firstPage = await client.searchVideos({ q: 'nature', page: 1, perPage: 50 });
    const searchId = firstPage.searchId;

    // Later, download videos from this search
    const download = await client.downloadVideo('video_xyz', {
      searchId  // Track back to original search
    });
    ```

## Handling Empty Results

If no results match your query:

=== "Python"

    ```python
    results = client.search_videos(q="nonexistent_query_xyz")
    
    if not results.videos:
        print("No videos found for this query.")
    else:
        print(f"Found {len(results.videos)} videos.")
    ```

=== "JavaScript"

    ```javascript
    const results = await client.searchVideos({ q: 'nonexistent_query_xyz' });
    
    if (results.videos.length === 0) {
      console.log('No videos found for this query.');
    } else {
      console.log(`Found ${results.videos.length} videos.`);
    }
    ```

## Collecting All Results

To collect all results from a search into a single list:

=== "Python"

    ```python
    all_videos = []
    page = 1
    
    while True:
        results = client.search_videos(
            q="nature",
            page=page,
            per_page=80  # Max page size
        )
        
        all_videos.extend(results.videos)
        
        if not results.has_more:
            break
        
        page += 1
    
    print(f"Total videos: {len(all_videos)}")
    ```

=== "JavaScript"

    ```javascript
    const allVideos = [];
    let page = 1;
    
    while (true) {
      const results = await client.searchVideos({
        q: 'nature',
        page,
        perPage: 80  // Max page size
      });
      
      allVideos.push(...results.videos);
      
      if (!results.hasMore) break;
      page++;
    }
    
    console.log(`Total videos: ${allVideos.length}`);
    ```

## Limiting Results

To stop after a certain number of results:

=== "Python"

    ```python
    all_videos = []
    limit = 1000
    page = 1
    
    while len(all_videos) < limit:
        results = client.search_videos(
            q="nature",
            page=page,
            per_page=min(80, limit - len(all_videos))
        )
        
        all_videos.extend(results.videos)
        
        if not results.has_more:
            break
        
        page += 1
    
    print(f"Collected {len(all_videos)} videos (limited to {limit})")
    ```

=== "JavaScript"

    ```javascript
    const allVideos = [];
    const limit = 1000;
    let page = 1;
    
    while (allVideos.length < limit) {
      const results = await client.searchVideos({
        q: 'nature',
        page,
        perPage: Math.min(80, limit - allVideos.length)
      });
      
      allVideos.push(...results.videos);
      
      if (!results.hasMore) break;
      page++;
    }
    
    console.log(`Collected ${allVideos.length} videos (limited to ${limit})`);
    ```

---

**Key Rules:**
1. Always paginate sequentially (page 1 → 2 → 3)
2. Keep `per_page`/`perPage` consistent while paginating
3. Check `has_more`/`hasMore` to know when to stop
4. Preserve `search_id`/`searchId` for analytics
