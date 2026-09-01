/**
 * Client for the GridBank Partner API.
 *
 * Reads and downloads the videos your account has licensed. Separate from
 * `EnterpriseClient`, which serves leased collections to enterprise contracts:
 * different credential, different contract.
 *
 * Create a key from your account settings on gridbank.io.
 *
 * ```ts
 * import { PartnerClient } from "@gridbank/api-js";
 *
 * const client = new PartnerClient({ apiKey: "apik_..." });
 *
 * for await (const video of client.content()) {
 *   const response = await client.fetchDownload(video.id);
 *   // pipe response.body wherever it belongs
 * }
 * ```
 */

const BASE_URL = "https://api2.gridbank.io";
const PARTNER_PREFIX = "/partner/v1";
const DEFAULT_PER_PAGE = 50;

import type { Creator, Video } from "./index";

/** The wire shape of a video, before it is mapped onto {@link Video}. */
interface VideoPayload {
  video_key: string;
  creator?: { id?: string; username?: string | null; name?: string | null } | null;
  title?: string | null;
  duration_seconds?: number | null;
  purchased_at?: number | null;
  preview_url?: string | null;
  thumbnail_url?: string | null;
}

function toVideo(data: VideoPayload): Video {
  const creator = data.creator ?? {};
  return {
    id: data.video_key,
    creator: { id: creator.id ?? "", username: creator.username ?? "", name: creator.name },
    title: data.title,
    duration: data.duration_seconds,
    url: data.preview_url,
    thumbnail: data.thumbnail_url,
    purchasedAt: data.purchased_at,
  };
}

export interface ContentPage {
  videos: VideoPayload[];
  next_cursor?: string | null;
}

export interface ContentDownload {
  video_key: string;
  url: string;
  expires_at: number;
}

export interface PartnerClientOptions {
  apiKey: string;
  baseUrl?: string;
  maxRetries?: number;
  timeoutMs?: number;
  userAgent?: string;
}

/** Any non-success response from the Partner API. */
export class ContentError extends Error {
  readonly statusCode: number;
  readonly details: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = "ContentError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * The video exists on GridBank, but this account has not licensed it.
 *
 * Distinct from `VideoNotFound` on purpose: this one is resolved by licensing
 * the video, so it is worth catching separately from a bad key or a typo.
 */
export class NotLicensed extends ContentError {
  constructor(statusCode: number, message: string, details?: unknown) {
    super(statusCode, message, details);
    this.name = "NotLicensed";
  }
}

/** No video with that key. */
export class VideoNotFound extends ContentError {
  constructor(statusCode: number, message: string, details?: unknown) {
    super(statusCode, message, details);
    this.name = "VideoNotFound";
  }
}

/** The API key is missing, malformed, or revoked. */
export class NotAuthenticated extends ContentError {
  constructor(statusCode: number, message: string, details?: unknown) {
    super(statusCode, message, details);
    this.name = "NotAuthenticated";
  }
}

/**
 * A 403 from the edge is a bare `{"message": "Forbidden"}` with no error
 * envelope, and has nothing to do with licensing. Only the API's own 403 means
 * the caller has not licensed the video.
 */
function hasErrorEnvelope(body: unknown): boolean {
  if (!body || typeof body !== "object" || !("detail" in body)) return false;
  const detail = (body as { detail: unknown }).detail;
  return !!detail && typeof detail === "object" && "error" in detail;
}

function errorFor(status: number, message: string, body: unknown): ContentError {
  if (status === 401) return new NotAuthenticated(status, message, body);
  if (status === 403 && hasErrorEnvelope(body)) return new NotLicensed(status, message, body);
  if (status === 404) return new VideoNotFound(status, message, body);
  return new ContentError(status, message, body);
}

function messageFrom(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "error" in detail) {
      const error = (detail as { error: unknown }).error;
      if (error && typeof error === "object" && "message" in error) {
        return String((error as { message: unknown }).message);
      }
    }
  }
  return fallback;
}

type Params = Record<string, string | number | null | undefined>;

export class PartnerClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;
  private readonly userAgent?: string;

  constructor(options: PartnerClientOptions) {
    if (!options.apiKey) throw new Error("apiKey is required");

    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? BASE_URL).replace(/\/$/, "") + PARTNER_PREFIX;
    // maxRetries is a total attempt count, matching EnterpriseClient. Floored at one
    // so 0 disables retrying rather than sending nothing at all.
    this.maxRetries = Math.max(1, options.maxRetries ?? 3);
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.userAgent = options.userAgent;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { Authorization: `Bearer ${this.apiKey}` };
    if (this.userAgent) headers["User-Agent"] = this.userAgent;
    return headers;
  }

  private async request<T>(path: string, params?: Params): Promise<T> {
    const url = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value != null) url.searchParams.set(key, String(value));
    }

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      let response: Response;
      try {
        response = await fetch(url.toString(), {
          headers: this.headers(),
          signal: controller.signal,
        });
      } catch (err) {
        throw new ContentError(0, err instanceof Error ? err.message : "Request failed", err);
      } finally {
        clearTimeout(timer);
      }

      if (response.status === 429 && attempt < this.maxRetries - 1) {
        const retryAfter = response.headers.get("Retry-After");
        const wait = retryAfter ? parseFloat(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, wait));
        continue;
      }

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        if (response.ok) {
          throw new ContentError(response.status, "Server returned a non-JSON response");
        }
      }

      if (!response.ok) {
        throw errorFor(response.status, messageFrom(body, response.statusText), body);
      }

      return body as T;
    }

    throw new ContentError(429, "Rate limited, and retries are exhausted");
  }

  /**
   * Every video this account has licensed, newest purchase first.
   *
   * Pages are fetched as they are consumed, so breaking out of the loop early
   * does not pay for the rest.
   */
  async *content(options: { perPage?: number } = {}): AsyncGenerator<Video> {
    const perPage = options.perPage ?? DEFAULT_PER_PAGE;
    let cursor: string | null | undefined;

    for (;;) {
      const page = await this.request<ContentPage>("/content", {
        per_page: perPage,
        cursor,
      });

      for (const video of page.videos ?? []) yield toVideo(video);

      cursor = page.next_cursor;
      if (!cursor) return;
    }
  }

  /**
   * A URL for the master file, valid for about five minutes.
   *
   * Prefer {@link fetchDownload} unless you need the URL itself; it handles the
   * expiry for you.
   */
  async downloadUrl(videoKey: string): Promise<string> {
    const result = await this.request<ContentDownload>(
      `/videos/${encodeURIComponent(videoKey)}/download`
    );
    return result.url;
  }

  /**
   * Fetch a licensed video, returning the response so the caller can stream it.
   *
   * Deliberately not "download to a path": this package runs in browsers as
   * well as Node, and only the caller knows where the bytes should go. Pipe
   * `response.body`, or await `response.blob()`.
   *
   * The signed URL expires quickly, and going stale between being issued and
   * used is the normal way this fails, so a rejected URL is re-requested once.
   *
   * @throws {NotLicensed} this account has not licensed the video
   * @throws {VideoNotFound} no video with that key
   */
  async fetchDownload(videoKey: string): Promise<Response> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const url = await this.downloadUrl(videoKey);
      const response = await fetch(url);

      if (response.ok) return response;

      const expired = response.status === 400 || response.status === 403;
      if (!expired || attempt === 1) {
        throw new ContentError(
          response.status,
          `Could not fetch the signed URL for ${videoKey}`
        );
      }
      // The URL went stale between issuing and using it; ask for another.
    }

    throw new ContentError(0, `Could not fetch ${videoKey}`);
  }
}
