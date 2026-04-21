"use client";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { usePlaylistStore } from "@/lib/store";
import { MOCK_TRACKS, MOCK_FILTER } from "@/lib/mockData";
import type { Track } from "@/types";

// Detect if a refinement is purely additive (just adding songs, no other changes)
function isAdditiveOnly(prevFilter: any, newFilter: any): boolean {
  if (!newFilter?.song_requests?.length) return false;
  // Check that nothing else materially changed
  const sameMood = prevFilter?.mood === newFilter.mood;
  const sameEnergy = prevFilter?.energy === newFilter.energy;
  const samePopularity = prevFilter?.popularity === newFilter.popularity;
  const sameSeeds = JSON.stringify((prevFilter?.artist_seeds ?? []).sort()) ===
    JSON.stringify((newFilter.artist_seeds ?? []).sort());
  return sameMood && sameEnergy && samePopularity && sameSeeds;
}

export function usePlaylist() {
  const { data: session } = useSession();
  const {
    tracks,
    pinnedTracks,
    filter,
    playlistName,
    chatHistory,
    isLoading,
    setTracks,
    setFilter,
    setPlaylistName,
    addMessage,
    setLoading,
    togglePin,
  } = usePlaylistStore();

  // Merge pinned tracks into the front, then fill rest with new tracks (deduped)
  const mergeWithPinned = (newTracks: Track[]): Track[] => {
    const pinnedIds = new Set(pinnedTracks.map((t) => t.id));
    const filtered = newTracks.filter((t) => !pinnedIds.has(t.id));
    const merged = [...pinnedTracks.map((t) => ({ ...t, pinned: true })), ...filtered];
    return merged.slice(0, 20);
  };

  const generate = async (prompt: string) => {
    setLoading(true);
    const shortName = prompt.split(" ").slice(0, 5).join(" ");
    setPlaylistName(shortName);
    addMessage({ role: "user", content: prompt, timestamp: new Date() });

    try {
      const res = await fetch("/api/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          userId: (session?.user as any)?.id ?? session?.user?.email,
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setTracks(mergeWithPinned(data.tracks));
      setFilter(data.filter);

      const pinnedNote = pinnedTracks.length
        ? ` (kept ${pinnedTracks.length} pinned)`
        : "";
      addMessage({
        role: "assistant",
        content: (data.filter.responseMessage ?? `got 20 tracks for that vibe`) + pinnedNote,
        timestamp: new Date(),
        filterApplied: data.filter,
      });
    } catch (err: any) {
      console.error("Generate error:", err);
      toast.error("api unavailable — showing demo tracks");
      setTracks(mergeWithPinned(MOCK_TRACKS));
      setFilter(MOCK_FILTER);
      addMessage({
        role: "assistant",
        content: "showing demo tracks — add api keys for real results.",
        timestamp: new Date(),
      });
    } finally {
      setLoading(false);
    }
  };

  const refine = async (instruction: string) => {
    addMessage({ role: "user", content: instruction, timestamp: new Date() });
    setLoading(true);

    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, currentFilter: filter }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // ADDITIVE MODE: prepend the new tracks to the existing playlist
      if (data.additive && data.tracks?.length) {
        const existingIds = new Set(tracks.map((t) => t.id));
        const newOnes = data.tracks.filter((t: any) => !existingIds.has(t.id));
        const merged = [...newOnes, ...tracks].slice(0, 30);
        setTracks(mergeWithPinned(merged));
      } else {
        setTracks(mergeWithPinned(data.tracks));
      }
      setFilter(data.filter);

      // Build an honest response message based on what really happened
      const pinnedNote = pinnedTracks.length
        ? ` · kept ${pinnedTracks.length} pinned`
        : "";

      let msg = data.filter.responseMessage ?? data.changeSummary;

      // Detect what actually changed and tell the truth
      if (data.additive && data.tracks?.length) {
        const titles = data.tracks.slice(0, 3).map((t: any) => t.title).join(", ");
        msg = `added ${titles}${data.tracks.length > 3 ? ` +${data.tracks.length - 3} more` : ""}`;
      } else if (data.tracks?.length) {
        // Count how many are new vs carried over
        const oldIds = new Set(tracks.map((t) => t.id));
        const newCount = data.tracks.filter((t: any) => !oldIds.has(t.id)).length;
        if (newCount > 0 && newCount < data.tracks.length) {
          msg = `${msg} · ${newCount} new tracks, ${data.tracks.length - newCount} carried over`;
        } else if (newCount === data.tracks.length) {
          msg = `${msg} · refreshed all ${newCount} tracks`;
        } else if (newCount === 0) {
          msg = `hmm, no new tracks found — try being more specific or try a different artist`;
        }
      }

      addMessage({
        role: "assistant",
        content: msg + pinnedNote,
        timestamp: new Date(),
        filterApplied: data.filter,
      });
    } catch (err: any) {
      console.error("Refine error:", err);
      const shuffled = [...(tracks.length ? tracks : MOCK_TRACKS)].sort(() => Math.random() - 0.5);
      setTracks(mergeWithPinned(shuffled));
      addMessage({
        role: "assistant",
        content: `applied "${instruction}" — demo mode fallback.`,
        timestamp: new Date(),
      });
    } finally {
      setLoading(false);
    }
  };

  const saveToSpotify = async (): Promise<string | null> => {
    if (!tracks.length) {
      toast.error("no tracks to save");
      return null;
    }
    try {
      const res = await fetch("/api/save-to-spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks, playlistName }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.url;
    } catch (err: any) {
      toast.error(err.message ?? "failed to save");
      return null;
    }
  };

  return {
    tracks,
    pinnedTracks,
    filter,
    playlistName,
    chatHistory,
    isLoading,
    generate,
    refine,
    saveToSpotify,
    setPlaylistName,
    togglePin,
  };
}
