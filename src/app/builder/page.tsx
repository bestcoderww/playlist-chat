"use client";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { usePlaylist } from "@/hooks/usePlaylist";
import { PlaylistPanel } from "@/components/ui/PlaylistPanel";
import { ChatPanel } from "@/components/ui/ChatPanel";
import { BounceDots } from "@/components/ui/Spinner";

export default function BuilderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isMobileChat, setIsMobileChat] = useState(false);

  const {
    tracks,
    filter,
    playlistName,
    chatHistory,
    isLoading,
    generate,
    refine,
    saveToSpotify,
    setPlaylistName,
    togglePin,
  } = usePlaylist();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  const handleGenerate = async (prompt: string) => {
    setHasGenerated(true);
    await generate(prompt);
  };

  const handleSave = async () => {
    const url = await saveToSpotify();
    if (url) {
      toast.success(
        (t) => (
          <span>
            saved!{" "}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
              onClick={() => toast.dismiss(t.id)}
            >
              open in spotify →
            </a>
          </span>
        ),
        { duration: 6000 }
      );
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <BounceDots />
      </div>
    );
  }

  const chatUnread = chatHistory.filter((m) => m.role === "assistant").length;

  return (
    <div className="bg-bg flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
      {/* Topbar */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
          <span className="font-display text-sm font-semibold tracking-widest uppercase text-text-muted hidden sm:block">
            Playlist Chat
          </span>
        </div>

        {/* Mobile tab switcher */}
        <div className="flex items-center gap-1 md:hidden bg-surface rounded-lg p-1 border border-border">
          <button
            onClick={() => setIsMobileChat(false)}
            className={`px-3 py-1 rounded-md font-mono text-xs transition-all ${
              !isMobileChat ? "bg-accent text-black font-semibold" : "text-text-muted"
            }`}
          >
            playlist
          </button>
          <button
            onClick={() => setIsMobileChat(true)}
            className={`relative px-3 py-1 rounded-md font-mono text-xs transition-all ${
              isMobileChat ? "bg-accent text-black font-semibold" : "text-text-muted"
            }`}
          >
            chat
            {!isMobileChat && chatUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-accent text-black text-[8px] flex items-center justify-center font-bold leading-none">
                {chatUnread}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {session?.user?.image && (
            <img
              src={session.user.image}
              alt={session.user.name ?? "user"}
              className="w-6 h-6 rounded-full border border-border"
            />
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="font-mono text-xs text-muted hover:text-text-muted transition-colors hidden sm:block"
          >
            sign out
          </button>
        </div>
      </header>

      {/* Main split */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Playlist */}
        <div
          className={`flex flex-col border-r border-border overflow-hidden transition-all ${
            isMobileChat ? "hidden md:flex" : "flex"
          } w-full md:w-[55%] lg:w-[58%]`}
        >
          <PlaylistPanel
            tracks={tracks}
            isLoading={isLoading}
            playlistName={playlistName}
            filter={filter}
            onNameChange={setPlaylistName}
            onGenerate={handleGenerate}
            onSave={handleSave}
            onPin={togglePin}
            hasGenerated={hasGenerated}
          />
        </div>

        {/* Right: Chat */}
        <div
          className={`flex flex-col overflow-hidden transition-all ${
            isMobileChat ? "flex" : "hidden md:flex"
          } w-full md:w-[45%] lg:w-[42%]`}
        >
          {!hasGenerated ? (
            <EmptyChat />
          ) : (
            <ChatPanel
              messages={chatHistory}
              onSend={refine}
              isLoading={isLoading}
              currentFilter={filter}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
      <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-lg">
        💬
      </div>
      <div>
        <p className="font-display text-base font-semibold mb-1.5">refine with chat</p>
        <p className="font-sans text-sm text-text-muted leading-relaxed max-w-[220px]">
          generate a playlist first, then refine it through conversation
        </p>
      </div>
      <div className="mt-2 space-y-2 w-full max-w-[260px]">
        {["more underground", "warmer and more dreamy", "less upbeat, darker"].map((ex) => (
          <div
            key={ex}
            className="px-3 py-2 rounded-lg border border-border text-xs font-mono text-muted text-left"
          >
            &quot;{ex}&quot;
          </div>
        ))}
      </div>
    </div>
  );
}
