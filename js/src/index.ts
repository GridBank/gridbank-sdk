const _BASE_URL = "https://api.gridbank.io";

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface Creator {
  id: string;
  username: string;
  name?: string | null;
  bio?: string | null;
  profile_image?: string | null;
}

export interface Location {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}

export interface Video {
  id: string;
  content_tier: string;
  created_at: string;
  creator: Creator;
  title?: string | null;
  description?: string | null;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  url?: string | null;
  thumbnail?: string | null;
  location?: Location | null;
  is_featured?: boolean | null;
  keywords?: string[] | null;
}

export interface VideoListResponse {
  search_id: string;
  page: number;
  per_page: number;
  has_more: boolean;
  videos: Video[];
}

export interface DownloadResult {
  video_id: string;
  url: string;
  expires_at: string;
  file_size: number;
  format: string;
}

export interface TopVideo {
  video_id: string;
  download_count: number;
  thumbnail?: string | null;
}

export interface UsageSummary {
  customer_id: string;
  tier: string;
  lease_period_start: string;
  lease_period_end: string;
  downloads_this_period: number;
  active_collections_count: number;
  wildcard_enabled: boolean;
  top_videos: TopVideo[];
}

export interface PingResponse {
  ping: string;
  timestamp?: string | null;
}

// ---------------------------------------------------------------------------
// Client options
// ---------------------------------------------------------------------------

export interface GridbankClientOptions {
  apiKey: string;
  baseUrl?: string;
}

export interface SearchVideosOptions {
  q: string;
  sort?: "relevant" | "popular" | "recent";
  page?: number;
  per_page?: number;
  duration_min?: number;
  duration_max?: number;
  theme?: string;
  search_id?: string;
}

export interface DownloadVideoOptions {
  expires_in?: number;
  search_id?: string;
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class GridbankAPIError extends Error {
  readonly statusCode: number;
  readonly details: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = "GridbankAPIError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

type Params = Record<string, string | number | boolean | null | undefined>;

export class GridbankClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: GridbankClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? _BASE_URL).replace(/\/$/, "");
  }

  private async request<T>(path: string, params?: Params): Promise<T> {
    const url = new URL(this.baseUrl + path);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value != null) url.searchParams.set(key, String(value));
      }
    }
    const response = await fetch(url.toString(), {
      headers: { "X-API-Key": this.apiKey },
    });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      if (response.ok) {
        throw new GridbankAPIError(
          response.status,
          `Server returned a non-JSON response (${response.status} ${response.statusText})`,
          null
        );
      }
    }
    if (!response.ok) {
      const message =
        body != null && typeof body === "object" && "detail" in body
          ? String((body as Record<string, unknown>).detail)
          : response.statusText;
      throw new GridbankAPIError(response.status, message, body);
    }
    return body as T;
  }

  ping(): Promise<PingResponse> {
    return this.request<PingResponse>("/external/ping");
  }

  searchVideos(options: SearchVideosOptions): Promise<VideoListResponse> {
    return this.request<VideoListResponse>("/external/v1/videos/search", {
      q: options.q,
      sort: options.sort,
      page: options.page,
      per_page: options.per_page,
      duration_min: options.duration_min,
      duration_max: options.duration_max,
      theme: options.theme,
      search_id: options.search_id,
    });
  }

  getVideo(videoId: string): Promise<Video> {
    return this.request<Video>(`/external/v1/videos/${videoId}`);
  }

  downloadVideo(videoId: string, options?: DownloadVideoOptions): Promise<DownloadResult> {
    return this.request<DownloadResult>(
      `/external/v1/videos/${videoId}/download`,
      { expires_in: options?.expires_in, search_id: options?.search_id }
    );
  }

  usageSummary(): Promise<UsageSummary> {
    return this.request<UsageSummary>("/external/v1/usage/me");
  }
}
