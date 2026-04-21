"use client";
import Image from "next/image";
import type { Track } from "@/types";

interface TrackCardProps {
  track: Track;
  index: number;
  onPin?: (track: Track) => void;
}

export function TrackCard({ track, index, onPin }: TrackCardProps) {
  const cardClasses = track.pinned
    ? "group flex items-center gap-3 p-3 rounded-lg border transition-all duration-150 border-accent bg-surface"
    : "group flex items-center gap-3 p-3 rounded-lg border transition-all duration-150 border-border bg-surface hover:border-muted";

  const pinClasses = track.pinned
    ? "shrink-0 p-1.5 rounded-md transition-all text-accent opacity-100"
    : "shrink-0 p-1.5 rounded-md transition-all text-muted opacity-0 group-hover:opacity-100 hover:text-accent";

  return (
    <div className={cardClasses}>
      <span className="font-mono text-xs text-muted w-5 text-right shrink-0">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="relative w-10 h-10 rounded-md overflow-hidden bg-border shrink-0">
        {track.albumArt ? (
          <Image
            src={track.albumArt}
            alt={track.album}
            fill
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-xs">
            ♪
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm font-medium text-text truncate leading-tight">
          {track.title}
        </p>
        <p className="font-sans text-xs text-text-muted truncate mt-0.5">
          {track.artist}
        </p>
        <p className="font-mono text-[10px] text-muted truncate mt-1 leading-tight">
          {track.reason}
        </p>
      </div>

      {onPin && (
        <button
          onClick={() => onPin(track)}
          className={pinClasses}
          title={track.pinned ? "unpin" : "pin to keep through refinements"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={track.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
      )}

      <a
        href={"https://open.spotify.com/track/" + track.id}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-surface"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#1DB954">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
      </a>
    </div>
  );
}

export function TrackCardSkeleton({ index }: { index: number }) {
  const delay = (index * 50) + "ms";
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border" style={{ animationDelay: delay }}>
      <span className="w-5" />
      <div className="w-10 h-10 rounded-md skeleton shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 rounded skeleton w-3/4" />
        <div className="h-2 rounded skeleton w-1/2" />
        <div className="h-2 rounded skeleton w-2/3" />
      </div>
    </div>
  );
}
