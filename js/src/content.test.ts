import {
  NotAuthenticated,
  NotLicensed,
  AccessRevoked,
  PartnerApiNotIncluded,
  PartnerClient,
  ReadOnlyKey,
  LicenseRefused,
  ContentError,
  VideoNotFound,
} from "./content";
import type { Video } from "./index";

const BASE = "https://api2.gridbank.io/partner/v1";
const SIGNED = "https://s3.example/video.mp4?sig=abc";

function video(key: string) {
  return {
    video_key: key,
    title: `Clip ${key}`,
    duration_seconds: 12.5,
    purchased_at: 1756200000,
    preview_url: "https://cdn.example/p.mp4",
    thumbnail_url: "https://cdn.example/t.jpg",
    creator: { id: "crea_1", username: "jdoe", name: "J Doe" },
  };
}

function searchHit(key: string) {
  return {
    video_key: key,
    title: `Clip ${key}`,
    duration_seconds: 8,
    width_pixels: 1080,
    height_pixels: 1920,
    preview_url: "https://cdn.example/p.mp4",
    thumbnail_url: "https://cdn.example/t.jpg",
    creator: { id: "crea_1", username: "jdoe", name: "J Doe" },
  };
}

function searchPage(keys: string[], hasMore: boolean): Response {
  return json({ videos: keys.map(searchHit), has_more: hasMore, search_id: "s1" });
}

function sentBody(fetchMock: jest.SpyInstance, call = 0): unknown {
  return JSON.parse(String(fetchMock.mock.calls[call][1].body));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorBody(message: string) {
  return { detail: { error: { code: "x", message, details: {} } } };
}

function revokedBody() {
  return {
    detail: {
      error: {
        code: "partner_access_revoked",
        message: "Partner API access has been revoked for this account",
        details: {},
      },
    },
  };
}

function client() {
  return new PartnerClient({ apiKey: "apik_test.secret" });
}

afterEach(() => jest.restoreAllMocks());

async function collect(iterator: AsyncGenerator<Video>): Promise<string[]> {
  const keys: string[] = [];
  for await (const video of iterator) keys.push(video.id);
  return keys;
}

async function collectAll<T>(iterator: AsyncGenerator<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterator) items.push(item);
  return items;
}

describe("construction", () => {
  it("rejects an empty key up front", () => {
    expect(() => new PartnerClient({ apiKey: "" })).toThrow("apiKey is required");
  });
});

describe("content iteration", () => {
  it("follows the cursor across pages", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(json({ videos: [video("a"), video("b")], next_cursor: "c1" }))
      .mockResolvedValueOnce(json({ videos: [video("c")], next_cursor: null }));

    expect(await collect(client().content())).toEqual(["a", "b", "c"]);
  });

  it("stops when there is no cursor", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(json({ videos: [video("a")], next_cursor: null }));

    expect(await collect(client().content())).toEqual(["a"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("yields nothing for an empty library", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(json({ videos: [], next_cursor: null }));

    expect(await collect(client().content())).toEqual([]);
  });

  it("maps the wire fields onto Video", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(json({ videos: [video("a")], next_cursor: null }));

    let first: Video | undefined;
    for await (const video of client().content()) first = video;

    expect(first).toEqual({
      id: "a",
      title: "Clip a",
      duration: 12.5,
      url: "https://cdn.example/p.mp4",
      thumbnail: "https://cdn.example/t.jpg",
      purchasedAt: 1756200000,
      creator: { id: "crea_1", username: "jdoe", name: "J Doe" },
    });
  });

  it("does not fetch pages the caller never asks for", async () => {
    // Laziness is the point of an async iterator - stopping early must cost nothing.
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(json({ videos: [video("a"), video("b")], next_cursor: "c1" }));

    for await (const first of client().content()) {
      expect(first.id).toBe("a");
      break;
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends the cursor and page size", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(json({ videos: [], next_cursor: null }));

    await collect(client().content({ perPage: 10 }));

    expect(String(fetchMock.mock.calls[0][0])).toContain("per_page=10");
  });
});

function creatorPage(ids: string[], hasMore: boolean): Response {
  return json({
    creators: ids.map(id => ({
      id,
      username: `user_${id}`,
      name: "J Doe",
      image_url: "https://cdn.example/me.jpg",
      bio: "Drone pilot",
      is_top_creator: true,
      clips_count: 42,
      is_favorited: true,
      videos: [{ ...searchHit("v1"), creator: undefined }],
    })),
    has_more: hasMore,
    total_items: 9,
  });
}

describe("searchCreators", () => {
  it("posts the query and filters", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(creatorPage([], false));

    await collectAll(
      client().searchCreators("jdoe", {
        location: "PRT",
        topOnly: true,
        featuredOnly: true,
        favoritesOnly: true,
        perPage: 10,
      })
    );

    expect(String(fetchMock.mock.calls[0][0])).toBe(`${BASE}/search/creators`);
    expect(sentBody(fetchMock)).toEqual({
      query: "jdoe",
      location: "PRT",
      top_only: true,
      featured_only: true,
      favorites_only: true,
      items: 10,
      page: 0,
    });
  });

  it("browses every creator with no query", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(creatorPage([], false));

    await collectAll(client().searchCreators());

    expect(sentBody(fetchMock)).toStrictEqual({
      query: "",
      items: 50,
      top_only: false,
      featured_only: false,
      favorites_only: false,
      page: 0,
    });
  });

  it("pages while there is more", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(creatorPage(["a", "b"], true))
      .mockResolvedValueOnce(creatorPage(["c"], false));

    const results = await collectAll(client().searchCreators());

    expect(results.map(r => r.creator.id)).toEqual(["a", "b", "c"]);
    expect([0, 1].map(i => (sentBody(fetchMock, i) as { page: number }).page)).toEqual([0, 1]);
  });

  it("maps the wire fields onto CreatorResult", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(creatorPage(["a"], false));

    const [first] = await collectAll(client().searchCreators());

    expect(first.creator).toEqual({
      id: "a",
      username: "user_a",
      name: "J Doe",
      bio: "Drone pilot",
      profile_image: "https://cdn.example/me.jpg",
    });
    expect(first.isTopCreator).toBe(true);
    expect(first.clipsCount).toBe(42);
    expect(first.isFavorited).toBe(true);
    expect(first.videos.map(v => v.id)).toEqual(["v1"]);
    expect(first.videos[0].creator).toEqual(first.creator);
  });
});

describe("search", () => {
  it("posts the query and filters", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(searchPage([], false));

    await collect(
      client().search("surf", {
        location: "Lisbon, PRT",
        sort: "recent",
        durationGte: 5,
        durationLte: 20,
        perPage: 10,
      })
    );

    expect(String(fetchMock.mock.calls[0][0])).toBe(`${BASE}/search`);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    expect(sentBody(fetchMock)).toEqual({
      query: "surf",
      location: "Lisbon, PRT",
      sort: "recent",
      duration_gte: 5,
      duration_lte: 20,
      items: 10,
      page: 0,
    });
  });

  it("leaves unset filters to the server", async () => {
    // The API rejects null durations, so an omitted filter must not be sent at all.
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(searchPage([], false));

    await collect(client().search("surf"));

    expect(sentBody(fetchMock)).toStrictEqual({ query: "surf", items: 50, page: 0 });
  });

  it("pages while there is more", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(searchPage(["a", "b"], true))
      .mockResolvedValueOnce(searchPage(["c"], false));

    expect(await collect(client().search("surf"))).toEqual(["a", "b", "c"]);
    expect([0, 1].map(i => (sentBody(fetchMock, i) as { page: number }).page)).toEqual([0, 1]);
  });

  it("does not treat a short page as the end", async () => {
    // Only has_more ends the search; a page can come back under-filled.
    jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(searchPage(["a"], true))
      .mockResolvedValueOnce(searchPage(["b"], false));

    expect(await collect(client().search("surf", { perPage: 10 }))).toEqual(["a", "b"]);
  });

  it("does not fetch pages the caller never asks for", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(searchPage(["a", "b"], true));

    for await (const first of client().search("surf")) {
      expect(first.id).toBe("a");
      break;
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps the wire fields onto Video", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(searchPage(["a"], false));

    let first: Video | undefined;
    for await (const video of client().search("surf")) first = video;

    expect(first).toEqual({
      id: "a",
      searchId: "s1",
      title: "Clip a",
      duration: 8,
      width: 1080,
      height: 1920,
      url: "https://cdn.example/p.mp4",
      thumbnail: "https://cdn.example/t.jpg",
      creator: { id: "crea_1", username: "jdoe", name: "J Doe" },
    });
  });

  it("maps a validation error to ContentError", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(json({ detail: [{ loc: ["body", "query"], msg: "too short" }] }, 422));

    const error = await collect(client().search(" ")).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ContentError);
    expect((error as ContentError).statusCode).toBe(422);
  });

  it("retries a rate-limited search after Retry-After", async () => {
    jest.useFakeTimers();
    try {
      const fetchMock = jest
        .spyOn(global, "fetch")
        .mockResolvedValueOnce(new Response(null, { status: 429, headers: { "Retry-After": "7" } }))
        .mockResolvedValueOnce(searchPage(["a"], false));

      const keys = collect(client().search("surf"));
      await jest.advanceTimersByTimeAsync(6_999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);

      expect(await keys).toEqual(["a"]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(sentBody(fetchMock, 1)).toEqual(sentBody(fetchMock, 0));
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("error mapping", () => {
  it.each([
    [401, NotAuthenticated],
    [403, NotLicensed],
    [404, VideoNotFound],
    [500, ContentError],
  ])("maps %s to a typed error", async (status, expected) => {
    jest.spyOn(global, "fetch").mockResolvedValue(json(errorBody("nope"), status as number));

    await expect(client().downloadUrl("v1")).rejects.toBeInstanceOf(expected);
  });

  it("distinguishes not-licensed from not-found", async () => {
    // A caller resolves one of these by buying a licence, not by fixing a typo.
    // A fresh Response per call: a body can only be read once.
    jest
      .spyOn(global, "fetch")
      .mockImplementation(async () => json(errorBody("Video not purchased."), 403));

    const error = await client()
      .downloadUrl("v1")
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotLicensed);
    expect(error).not.toBeInstanceOf(VideoNotFound);
    expect((error as ContentError).message).toBe("Video not purchased.");
  });

  it("does not treat an edge 403 as a licensing error", async () => {
    // WAF rejections carry no error envelope and say nothing about licensing.
    jest
      .spyOn(global, "fetch")
      .mockImplementation(async () => json({ message: "Forbidden" }, 403));

    const error = await client()
      .downloadUrl("v1")
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ContentError);
    expect(error).not.toBeInstanceOf(NotLicensed);
    expect((error as ContentError).statusCode).toBe(403);
  });

  it("does not treat a revoked account as a licensing error", async () => {
    // Both are 403 with an envelope. Only the code separates "buy this video"
    // from "GridBank has blocked you", and the second is not fixable by the
    // caller.
    jest.spyOn(global, "fetch").mockImplementation(async () => json(revokedBody(), 403));

    const error = await client()
      .downloadUrl("v1")
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AccessRevoked);
    expect(error).not.toBeInstanceOf(NotLicensed);
    expect((error as ContentError).statusCode).toBe(403);
  });

  it("reports a revoked account from listing too", async () => {
    jest.spyOn(global, "fetch").mockImplementation(async () => json(revokedBody(), 403));

    const iterate = async () => {
      for await (const _ of client().content()) {
        // listing should throw before yielding anything
      }
    };

    await expect(iterate()).rejects.toBeInstanceOf(AccessRevoked);
  });

  it("keeps revocation catchable as a ContentError", async () => {
    // Callers catching ContentError broadly must not start leaking this.
    expect(new AccessRevoked(403, "x")).toBeInstanceOf(ContentError);
  });

  it("raises cleanly on a non-JSON error body", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response("<html>bad</html>", { status: 502 }));

    await expect(client().downloadUrl("v1")).rejects.toBeInstanceOf(ContentError);
  });
});

describe("fetchDownload", () => {
  it("returns the response so the caller can stream it", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(json({ video_key: "v1", url: SIGNED, expires_at: 1 }))
      .mockResolvedValueOnce(new Response("video-bytes", { status: 200 }));

    const response = await client().fetchDownload("v1");

    expect(await response.text()).toBe("video-bytes");
  });

  it("requests a fresh URL when the first has expired", async () => {
    // The URL lives five minutes; going stale mid-queue is normal, not an error.
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(json({ video_key: "v1", url: SIGNED, expires_at: 1 }))
      .mockResolvedValueOnce(new Response("AccessDenied", { status: 403 }))
      .mockResolvedValueOnce(json({ video_key: "v1", url: SIGNED, expires_at: 2 }))
      .mockResolvedValueOnce(new Response("fresh-bytes", { status: 200 }));

    const response = await client().fetchDownload("v1");

    expect(await response.text()).toBe("fresh-bytes");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("gives up after one retry", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(json({ video_key: "v1", url: SIGNED, expires_at: 1 }))
      .mockResolvedValueOnce(new Response("denied", { status: 403 }))
      .mockResolvedValueOnce(json({ video_key: "v1", url: SIGNED, expires_at: 2 }))
      .mockResolvedValueOnce(new Response("denied", { status: 403 }));

    await expect(client().fetchDownload("v1")).rejects.toBeInstanceOf(ContentError);
  });

  it("raises before fetching anything when the video is not licensed", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(json(errorBody("Video not purchased."), 403));

    await expect(client().fetchDownload("v1")).rejects.toBeInstanceOf(NotLicensed);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("escapes the video key in the path", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(json({ video_key: "a/b", url: SIGNED, expires_at: 1 }));

    await client().downloadUrl("a/b");

    expect(String(fetchMock.mock.calls[0][0])).toContain("a%2Fb");
  });
});

describe("plan without the Partner API", () => {
  it("reports the plan, not a licence, from search", async () => {
    // Search has no video to license, so this 403 must not read as NotLicensed.
    jest.spyOn(global, "fetch").mockImplementation(async () =>
      json(
        {
          detail: {
            error: {
              code: "partner_api_not_included",
              message: "Your plan does not include Partner API access",
              details: null,
            },
          },
        },
        403,
      ),
    );

    const iterate = async () => {
      for await (const _ of client().search("surfing")) {
        // search should throw before yielding anything
      }
    };

    const error = await iterate().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PartnerApiNotIncluded);
    expect(error).not.toBeInstanceOf(NotLicensed);
    expect(error).toBeInstanceOf(ContentError);
    expect((error as ContentError).statusCode).toBe(403);
  });
});

describe("license", () => {
  function codedError(code: string) {
    return { detail: { error: { code, message: "nope", details: {} } } };
  }

  it("licenses and reports the allowance", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(json({ video_key: "v1", already_licensed: false, downloads_remaining: 74 }));

    const result = await client().license("v1", { searchId: "s1" });

    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/videos/v1/license`);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    expect(sentBody(fetchMock)).toEqual({ search_id: "s1" });
    expect(result).toEqual({ videoId: "v1", alreadyLicensed: false, downloadsRemaining: 74 });
  });

  it("does not treat an already held video as an error", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(json({ video_key: "v1", already_licensed: true, downloads_remaining: null }));

    const result = await client().license("v1");

    expect(result.alreadyLicensed).toBe(true);
    expect(result.downloadsRemaining).toBeNull();
  });

  it("hands back the search id from search", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(searchPage(["v1"], false));

    const first = await client().search("surf").next();

    expect((first.value as Video).searchId).toBe("s1");
  });

  it("does not treat a read-only key as a licensing error", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(json(codedError("api_key_read_only"), 403));

    const error = await client().license("v1").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ReadOnlyKey);
    expect(error).not.toBeInstanceOf(NotLicensed);
    expect((error as ContentError).code).toBe("api_key_read_only");
  });

  it.each([
    [400, "no_downloads_remaining"],
    [400, "subscription_paused"],
    [400, "subscription_expired"],
    [400, "no_subscription"],
    [400, "unsupported_subscription"],
    [403, "plan_excludes_content"],
    [403, "inactive_team"],
  ])("reports a %i %s as LicenseRefused with its code", async (status, code) => {
    jest.spyOn(global, "fetch").mockResolvedValue(json(codedError(code), status));

    const error = await client().license("v1").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(LicenseRefused);
    expect(error).not.toBeInstanceOf(NotLicensed);
    expect((error as ContentError).code).toBe(code);
    expect((error as ContentError).statusCode).toBe(status);
  });

  it("reports an unavailable video as not found", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(json(codedError("video_not_available"), 404));

    const error = await client().license("v1").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(VideoNotFound);
    expect((error as ContentError).code).toBe("video_not_available");
  });
});
