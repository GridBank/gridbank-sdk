import {
  NotAuthenticated,
  NotLicensed,
  AccessRevoked,
  PartnerClient,
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
