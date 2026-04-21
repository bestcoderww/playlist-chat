"use client";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const VIBES = [
  "late night drive",
  "rainy sunday",
  "pre-show adrenaline",
  "study tunnel vision",
  "heartbreak at 2am",
  "golden hour rooftop",
  "first day of autumn",
  "midnight clarity",
];

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [vibeIdx, setVibeIdx] = useState(0);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (session) {
      router.push("/onboarding");
    }
  }, [session, router]);

  useEffect(() => {
    const t = setInterval(() => {
      setVibeIdx((i) => (i + 1) % VIBES.length);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    await signIn("spotify", { callbackUrl: "/onboarding" });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-1 h-6 bg-accent animate-pulse rounded-full" />
      </div>
    );
  }

  return (
    <div className="noise min-h-screen bg-bg flex flex-col overflow-hidden">
      {/* Ambient gradient blobs */}
      <div
        className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.04] blur-[120px] pointer-events-none"
        style={{ background: "#C8FF4D" }}
      />
      <div
        className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.03] blur-[100px] pointer-events-none"
        style={{ background: "#4DC8FF" }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span className="font-display text-sm font-semibold tracking-widest uppercase text-text-muted">
            Playlist Chat
          </span>
        </div>
        <div className="font-mono text-xs text-muted">beta</div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Label */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface mb-10">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="font-mono text-xs text-text-muted tracking-wider">
            conversational playlist editor
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-none tracking-tight mb-6 max-w-5xl">
          tell me the{" "}
          <span className="relative inline-block">
            <span
              key={vibeIdx}
              className="text-accent glow-text"
              style={{
                animation: "fadeUp 0.4s ease forwards",
              }}
            >
              {VIBES[vibeIdx]}
            </span>
          </span>
          <br />
          <span className="text-text-muted">feeling.</span>
        </h1>

        <p className="font-sans text-lg text-text-muted max-w-lg mb-12 leading-relaxed">
          describe a vibe. get a playlist. refine it through conversation.
          no forms, no sliders — just talk.
        </p>

        {/* CTA */}
        <button
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="group relative flex items-center gap-3 px-8 py-4 rounded-full bg-accent text-black font-display font-semibold text-base tracking-wide hover:bg-accent-dim transition-all duration-200 disabled:opacity-60 glow"
        >
          {isSigningIn ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              connecting...
            </>
          ) : (
            <>
              <SpotifyIcon />
              continue with spotify
            </>
          )}
        </button>

        <p className="mt-5 font-mono text-xs text-muted">
          we only request playlist creation permissions
        </p>
      </main>

      {/* Feature pills */}
      <footer className="relative z-10 pb-10 px-6">
        <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
          {[
            "more underground",
            "less rap",
            "darker",
            "more female vocals",
            "warmer",
            "more dreamy",
            "less upbeat",
          ].map((tag) => (
            <div
              key={tag}
              className="px-3 py-1 rounded-full border border-border text-text-muted font-mono text-xs"
            >
              {tag}
            </div>
          ))}
        </div>
        <p className="text-center font-mono text-xs text-muted mt-4">
          just say it. the playlist adjusts.
        </p>
      </footer>
    </div>
  );
}

function SpotifyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}
