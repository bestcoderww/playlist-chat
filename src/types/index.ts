
export interface PlaylistFilter {
  mood: string;
  energy: "low" | "medium-low" | "medium" | "medium-high" | "high";
  popularity: "lower" | "mixed" | "higher";
  vocals: "female-preferred" | "male-preferred" | "any" | "instrumental-ok";
  genre_bias: string[];
  exclude: string[];
  artist_seeds?: string[];
  song_requests?: { title: string; artist: string }[];
  related_artists?: string[];
  exclude_artists?: string[];
  tempo_feel?: "slow" | "mid" | "fast" | null;
  era?: string | null;
  rawInstruction?: string;
  responseMessage?: string;
}

export interface OnboardingPreferences {
  mainstream: number;
  vocals: number;
  instrumentation: number;
  energy: number;
  production: number;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  spotifyUri: string;
  reason: string;
  previewUrl?: string | null;
  pinned?: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  filterApplied?: Partial<PlaylistFilter>;
}
