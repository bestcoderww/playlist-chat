// src/lib/store.ts
import { create } from "zustand";
import type { Track, ChatMessage, PlaylistFilter, OnboardingPreferences } from "@/types";

interface PlaylistStore {
  tracks: Track[];
  pinnedTracks: Track[];
  filter: PlaylistFilter | null;
  playlistName: string;
  chatHistory: ChatMessage[];
  isLoading: boolean;
  savedPlaylistUrl: string | null;
  onboardingPrefs: OnboardingPreferences | null;
  onboardingDone: boolean;

  setTracks: (t: Track[]) => void;
  setFilter: (f: PlaylistFilter) => void;
  setPlaylistName: (n: string) => void;
  addMessage: (m: ChatMessage) => void;
  setLoading: (v: boolean) => void;
  setSavedUrl: (url: string) => void;
  setOnboardingPrefs: (p: OnboardingPreferences) => void;
  setOnboardingDone: (v: boolean) => void;
  togglePin: (track: Track) => void;
  isPinned: (trackId: string) => boolean;
  reset: () => void;
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  tracks: [],
  pinnedTracks: [],
  filter: null,
  playlistName: "My Playlist Chat",
  chatHistory: [],
  isLoading: false,
  savedPlaylistUrl: null,
  onboardingPrefs: null,
  onboardingDone: false,

  setTracks: (tracks) => {
    // Re-apply pinned status when setting tracks
    const pinnedIds = new Set(get().pinnedTracks.map((t) => t.id));
    const marked = tracks.map((t) => ({ ...t, pinned: pinnedIds.has(t.id) }));
    set({ tracks: marked });
  },
  setFilter: (filter) => set({ filter }),
  setPlaylistName: (playlistName) => set({ playlistName }),
  addMessage: (m) => set((s) => ({ chatHistory: [...s.chatHistory, m] })),
  setLoading: (isLoading) => set({ isLoading }),
  setSavedUrl: (savedPlaylistUrl) => set({ savedPlaylistUrl }),
  setOnboardingPrefs: (onboardingPrefs) => set({ onboardingPrefs }),
  setOnboardingDone: (onboardingDone) => set({ onboardingDone }),

  togglePin: (track) => {
    const { pinnedTracks, tracks } = get();
    const exists = pinnedTracks.some((t) => t.id === track.id);
    const newPinned = exists
      ? pinnedTracks.filter((t) => t.id !== track.id)
      : [...pinnedTracks, { ...track, pinned: true }];
    const newTracks = tracks.map((t) =>
      t.id === track.id ? { ...t, pinned: !exists } : t
    );
    set({ pinnedTracks: newPinned, tracks: newTracks });
  },

  isPinned: (trackId) => get().pinnedTracks.some((t) => t.id === trackId),

  reset: () =>
    set({
      tracks: [],
      pinnedTracks: [],
      filter: null,
      chatHistory: [],
      savedPlaylistUrl: null,
    }),
}));
