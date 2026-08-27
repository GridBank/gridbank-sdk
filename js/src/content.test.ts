import {
  NotAuthenticated,
  NotLicensed,
  GridBankAPIClient,
  PartnerError,
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
    content_tier: 0,
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

function client() {
  return new GridBankAPIClient({ apiKey: "apik_test.secret" });
}

afterEach(() => jest.restoreAllMocks());

async function collect(iterator: AsyncGenerator<Video>): Promise<string[]> {
  const keys: string[] = [];
  for await (const video of iterator) keys.push(video.id);
  return keys;
}

describe("construction", () => {
  it("rejects an empty key up front", () => {
    expect(() => new GridBankAPIClient({ apiKey: "" })).toThrow("apiKey is required");
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
    [500, PartnerError],
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
    expect((error as PartnerError).message).toBe("Video not purchased.");
  });

  it("raises cleanly on a non-JSON error body", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response("<html>bad</html>", { status: 502 }));

    await expect(client().downloadUrl("v1")).rejects.toBeInstanceOf(PartnerError);
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

    await expect(client().fetchDownload("v1")).rejects.toBeInstanceOf(PartnerError);
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
