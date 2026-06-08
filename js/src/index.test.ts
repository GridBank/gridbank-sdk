import { GridbankClient, GridbankAPIError } from "./index";

const BASE = "https://api2.gridbank.io";

const CREATOR = { username: "testuser", name: "Test User", bio: null, profile_image: null };
const VIDEO = {
  id: "vid_1",
  title: "Test Video",
  description: "A test video",
  duration: 30.5,
  width: 1920,
  height: 1080,
  url: "https://example.com/video.mp4",
  thumbnail: "https://example.com/thumb.jpg",
  creator: CREATOR,
  location: null,
  keywords: ["nature", "landscape"],
};

function mockFetch(body: unknown, status = 200): jest.SpyInstance {
  return jest.spyOn(global, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

afterEach(() => jest.restoreAllMocks());

const client = new GridbankClient({ apiKey: "apik_test" });

test("ping returns PingResponse", async () => {
  mockFetch({ ping: "pong", timestamp: "2026-06-08T12:00:00Z" });
  const result = await client.ping();
  expect(result.ping).toBe("pong");
  expect(result.timestamp).toBe("2026-06-08T12:00:00Z");
});

test("ping handles missing timestamp", async () => {
  mockFetch({ ping: "pong" });
  const result = await client.ping();
  expect(result.ping).toBe("pong");
  expect(result.timestamp).toBeUndefined();
});

test("searchVideos returns VideoListResponse", async () => {
  mockFetch({ search_id: "srch_1", page: 1, per_page: 15, has_more: false, videos: [VIDEO] });
  const result = await client.searchVideos({ q: "nature" });
  expect(result.search_id).toBe("srch_1");
  expect(result.videos).toHaveLength(1);
  expect(result.videos[0].id).toBe("vid_1");
  expect(result.videos[0].creator.username).toBe("testuser");
  expect(result.videos[0].keywords).toEqual(["nature", "landscape"]);
});

test("getVideo returns Video", async () => {
  mockFetch(VIDEO);
  const result = await client.getVideo("vid_1");
  expect(result.id).toBe("vid_1");
  expect(result.title).toBe("Test Video");
  expect(result.duration).toBe(30.5);
});

test("downloadVideo returns DownloadResult", async () => {
  mockFetch({
    video_id: "vid_1",
    url: "https://cdn.example.com/vid_1.mp4?sig=abc",
    expires_at: "2026-06-08T17:00:00Z",
    file_size: 104857600,
    format: "mp4",
  });
  const result = await client.downloadVideo("vid_1");
  expect(result.video_id).toBe("vid_1");
  expect(result.format).toBe("mp4");
  expect(result.file_size).toBe(104857600);
});

test("usageSummary returns UsageSummary", async () => {
  mockFetch({
    customer_id: "cust_1",
    tier: "growth",
    lease_period_start: "2026-06-01T00:00:00Z",
    lease_period_end: "2026-07-01T00:00:00Z",
    downloads_this_period: 42,
    active_collections_count: 3,
    wildcard_enabled: false,
    top_videos: [{ video_id: "vid_1", download_count: 10, thumbnail: null }],
  });
  const result = await client.usageSummary();
  expect(result.tier).toBe("growth");
  expect(result.downloads_this_period).toBe(42);
  expect(result.top_videos).toHaveLength(1);
  expect(result.top_videos[0].video_id).toBe("vid_1");
});

test("non-2xx response throws GridbankAPIError", async () => {
  mockFetch({ detail: "Video not found" }, 404);
  await expect(client.getVideo("missing")).rejects.toThrow(GridbankAPIError);
  await expect(client.getVideo("missing")).rejects.toMatchObject({ statusCode: 404 });
});
