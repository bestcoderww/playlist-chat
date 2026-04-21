// src/components/ui/PlaylistPanel.tsx
"use client";
import { useState } from "react";
import { TrackCard, TrackCardSkeleton } from "./TrackCard";
import { Spinner } from "./Spinner";
import type { Track, PlaylistFilter } from "@/types";

interface PlaylistPanelProps {
  tracks: Track[];
  isLoading: boolean;
  playlistName: string;
  filter: PlaylistFilter | null;
  onNameChange: (n: string) => void;
  onGenerate: (prompt: string) => void;
  onSave: () => Promise<void>;
  onPin?: (track: any) => void;
  hasGenerated: boolean;
}

export function PlaylistPanel({
  tracks,
  isLoading,
  playlistName,
  filter,
  onNameChange,
  onGenerate,
  onSave,
  onPin,
  hasGenerated,
}: PlaylistPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const handleGenerate = () => {
    const trimmed = prompt.trim();
    if (!trimmed || isLoading) return;
    onGenerate(trimmed);
    setPrompt("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave();
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 mb-1.5">
          {editingName ? (
            <input
              autoFocus
              value={playlistName}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
              className="font-display text-sm font-semibold bg-transparent outline-none border-b border-accent text-text flex-1 pb-0.5"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="font-display text-sm font-semibold text-text hover:text-accent transition-colors text-left truncate flex-1"
              title="click to rename"
            >
              {playlistName}
            </button>
          )}

          {tracks.length > 0 && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-black font-mono text-xs font-semibold hover:bg-accent-dim transition-colors disabled:opacity-50 shrink-0"
            >
              {isSaving ? (
                <Spinner size={11} />
              ) : (
                <SpotifyMini />
              )}
              {isSaving ? "saving..." : "save"}
            </button>
          )}
        </div>

        {/* Meta */}
        {tracks.length > 0 && filter && (
          <p className="font-mono text-[10px] text-muted">
            {tracks.length} tracks
            {filter.mood ? ` · ${filter.mood}` : ""}
            {filter.energy ? ` · ${filter.energy} energy` : ""}
            {filter.popularity !== "mixed" ? ` · ${filter.popularity}` : ""}
          </p>
        )}
      </div>

      {/* Prompt input — shown before first generation */}
      {!hasGenerated && (
        <div className="px-4 pt-4 shrink-0">
          <div className="rounded-xl border border-border bg-surface p-3.5">
            <p className="font-mono text-[10px] text-accent tracking-widest uppercase mb-2.5">
              describe your vibe
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="late night drive, something melancholic and slow with female vocals..."
              rows={3}
              className="w-full bg-transparent font-sans text-sm text-text placeholder:text-muted outline-none resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between mt-2.5">
              <span className="font-mono text-[10px] text-muted">
                shift+enter for new line
              </span>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-black font-mono text-xs font-semibold hover:bg-accent-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Spinner size={11} />
                    generating...
                  </>
                ) : (
                  "generate playlist →"
                )}
              </button>
            </div>
          </div>

          {/* Example prompts */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {[
              "rainy sunday morning",
              "pre-show hype",
              "study session lo-fi",
              "heartbreak at 2am",
            ].map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setPrompt(ex);
                  onGenerate(ex);
                  setPrompt("");
                }}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full border border-border text-[11px] font-mono text-muted hover:text-text hover:border-muted transition-all disabled:opacity-40"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Re-prompt when already generated */}
      {hasGenerated && (
        <div className="px-4 pt-3 pb-0 shrink-0">
          <div className="flex gap-2 items-center">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleGenerate();
              }}
              placeholder="start fresh: describe a new vibe..."
              className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 font-sans text-xs text-text placeholder:text-muted outline-none focus:border-muted transition-colors"
            />
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isLoading}
              className="px-3 py-2 rounded-lg bg-surface border border-border font-mono text-xs text-text-muted hover:border-muted hover:text-text transition-all disabled:opacity-40"
            >
              {isLoading ? <Spinner size={11} /> : "↺"}
            </button>
          </div>
        </div>
      )}

      {/* Track list */}
      <div className="flex-1 overflow-y-auto scroll-hidden px-4 py-3 space-y-1.5 min-h-0">
        {isLoading &&
          Array.from({ length: 12 }).map((_, i) => (
            <TrackCardSkeleton key={i} index={i} />
          ))}

        {!isLoading && tracks.length === 0 && hasGenerated && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-16">
            <span className="text-3xl">🫙</span>
            <p className="font-sans text-sm text-text-muted">no tracks found</p>
            <p className="font-mono text-xs text-muted">try a different vibe description</p>
          </div>
        )}

        {!isLoading &&
          tracks.map((track, i) => (
            <TrackCard key={`${track.id}-${i}`} track={track} index={i} onPin={onPin} />
          ))}
      </div>
    </div>
  );
}

function SpotifyMini() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}
