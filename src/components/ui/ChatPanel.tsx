"use client";
import { useState, useRef, useEffect } from "react";
import type { ChatMessage, PlaylistFilter } from "@/types";

const QUICK_COMMANDS = [
  "more underground",
  "more mainstream",
  "less rap",
  "more rap",
  "more shoegaze",
  "more indie",
  "more r&b",
  "more electronic",
  "more female vocals",
  "instrumental",
];

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (msg: string) => void;
  isLoading: boolean;
  currentFilter: PlaylistFilter | null;
}

export function ChatPanel({ messages, onSend, isLoading, currentFilter }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="font-display text-sm font-semibold tracking-wide">refine</span>
        </div>
        {currentFilter && (
          <p className="font-mono text-[10px] text-muted leading-relaxed">
            {currentFilter.mood} · {currentFilter.energy} energy · {currentFilter.popularity}
            {currentFilter.genre_bias?.[0] ? ` · ${currentFilter.genre_bias[0]}` : ""}
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scroll-hidden px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
            <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center">
              <span className="text-sm">💬</span>
            </div>
            <p className="font-sans text-sm text-text-muted max-w-[200px] leading-relaxed">
              tell me how to adjust the playlist
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center mt-2">
              {QUICK_COMMANDS.slice(0, 4).map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => onSend(cmd)}
                  className="px-2.5 py-1 rounded-full border border-border bg-surface text-xs font-mono text-text-muted hover:border-accent hover:text-accent transition-all"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatBubble key={i} message={msg} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <span className="font-mono text-xs text-muted">updating playlist...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick commands */}
      {messages.length > 0 && (
        <div className="px-4 py-2 border-t border-border shrink-0">
          <div className="flex gap-1.5 overflow-x-auto scroll-hidden pb-1">
            {QUICK_COMMANDS.map((cmd) => (
              <button
                key={cmd}
                onClick={() => onSend(cmd)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full border border-border bg-surface text-[11px] font-mono text-text-muted hover:border-accent hover:text-accent transition-all whitespace-nowrap disabled:opacity-40"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        <div className="flex items-end gap-2 bg-surface rounded-xl border border-border focus-within:border-muted transition-colors p-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="more underground, less rap..."
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-transparent font-sans text-sm text-text placeholder:text-muted resize-none outline-none leading-relaxed min-h-[24px] max-h-[80px]"
            style={{ scrollbarWidth: "none" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0 w-7 h-7 rounded-lg bg-accent flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent-dim transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <p className="font-mono text-[10px] text-muted mt-1.5 text-center">
          enter to send · shift+enter for new line
        </p>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
          isUser
            ? "bg-accent text-black font-sans"
            : "bg-surface border border-border font-sans text-text"
        }`}
      >
        {message.content}
        {message.filterApplied && (
          <div className="mt-1.5 pt-1.5 border-t border-border/50">
            <p className="font-mono text-[10px] text-muted">
              {Object.entries(message.filterApplied)
                .filter(([k]) => k !== "rawInstruction")
                .slice(0, 2)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                .join(" · ")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
