export interface Creator {
  id: string;
  name: string;
  username: string;
  bio: string;
  profile_image: string;
}

export interface Location {
  city: string;
  region: string;
  country: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  duration: number;
  width: number;
  height: number;
  url: string;
  thumbnail: string;
  creator: Creator;
  location: Location;
  content_tier: string;
  created_at: string;
  is_featured: boolean;
  keywords: string[];
}

export interface SearchResult {
  videos: Video[];
  has_more: boolean;
  search_id: string;
}

export interface DownloadResult {
  url: string;
  expires_at: string;
}

export interface UsageSummary {
  downloads_this_period: number;
  tier: string;
  lease_period_end: string;
}

export interface GridbankClientOptions {
  apiKey: string;
}

export interface SearchVideosOptions {
  q: string;
  sort?: 'relevant' | 'popular' | 'recent';
  page?: number;
  per_page?: number;
  duration_min?: number;
  duration_max?: number;
  theme?: string;
}

export interface DownloadVideoOptions {
  expiresIn?: number;
  searchId?: string;
}

export declare class GridbankAPIError extends Error {
  code: string;
  details?: unknown;
}

export declare class GridbankClient {
  constructor(options: GridbankClientOptions);
  searchVideos(options: SearchVideosOptions): Promise<SearchResult>;
  getVideo(videoId: string): Promise<Video>;
  downloadVideo(videoId: string, options?: DownloadVideoOptions): Promise<DownloadResult>;
  usageSummary(): Promise<UsageSummary>;
}
