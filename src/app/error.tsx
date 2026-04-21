"use client";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="font-mono text-xs text-accent tracking-widest uppercase mb-2">
        something went wrong
      </div>
      <p className="font-sans text-text-muted text-sm max-w-sm">
        {error.message ?? "an unexpected error occurred"}
      </p>
      <button
        onClick={reset}
        className="mt-2 px-4 py-2 rounded-lg bg-surface border border-border font-mono text-sm text-text hover:border-muted transition-colors"
      >
        try again
      </button>
    </div>
  );
}
