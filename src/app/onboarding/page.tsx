"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { usePlaylistStore } from "@/lib/store";
import type { OnboardingPreferences } from "@/types";

const QUESTIONS = [
  {
    key: "mainstream" as const,
    question: "how do you find music?",
    left: "hidden gems",
    right: "mainstream hits",
    leftIcon: "🔍",
    rightIcon: "📈",
  },
  {
    key: "vocals" as const,
    question: "what kind of vocals do you vibe with?",
    left: "soft & delicate",
    right: "powerful & raw",
    leftIcon: "🕊️",
    rightIcon: "🔥",
  },
  {
    key: "instrumentation" as const,
    question: "pick your sonic texture",
    left: "guitar & organic",
    right: "synth & electronic",
    leftIcon: "🎸",
    rightIcon: "🎹",
  },
  {
    key: "energy" as const,
    question: "what energy are you usually at?",
    left: "atmospheric & slow",
    right: "upbeat & moving",
    leftIcon: "🌊",
    rightIcon: "⚡",
  },
  {
    key: "production" as const,
    question: "studio or bedroom?",
    left: "raw & lo-fi",
    right: "polished & crisp",
    leftIcon: "📼",
    rightIcon: "💿",
  },
];

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const setOnboardingPrefs = usePlaylistStore((s) => s.setOnboardingPrefs);
  const setOnboardingDone = usePlaylistStore((s) => s.setOnboardingDone);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<OnboardingPreferences>>({});
  const [saving, setSaving] = useState(false);

  const current = QUESTIONS[step];
  const progress = ((step) / QUESTIONS.length) * 100;

  const handleAnswer = async (value: number) => {
    const updated = { ...answers, [current.key]: value };
    setAnswers(updated);

    if (step < QUESTIONS.length - 1) {
      setStep((s) => s + 1);
    } else {
      // All done
      setSaving(true);
      const prefs = updated as OnboardingPreferences;
      setOnboardingPrefs(prefs);
      setOnboardingDone(true);

      // Save to supabase if session available
      if (session?.accessToken) {
        try {
          await fetch("/api/onboarding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prefs }),
          });
        } catch {}
      }

      router.push("/builder");
    }
  };

  const handleSkip = () => {
    setOnboardingDone(true);
    router.push("/builder");
  };

  return (
    <div className="noise min-h-screen bg-bg flex flex-col">
      {/* Ambient */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.03] blur-[150px] pointer-events-none"
        style={{ background: "#C8FF4D" }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span className="font-display text-sm font-semibold tracking-widest uppercase text-text-muted">
            Playlist Chat
          </span>
        </div>
        <button
          onClick={handleSkip}
          className="font-mono text-xs text-muted hover:text-text-muted transition-colors"
        >
          skip →
        </button>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 px-8">
        <div className="h-px bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="font-mono text-xs text-muted">
            {step + 1} of {QUESTIONS.length}
          </span>
          <span className="font-mono text-xs text-muted">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Question */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <div
          key={step}
          className="w-full max-w-xl"
          style={{ animation: "fadeUp 0.35s ease forwards" }}
        >
          <p className="font-mono text-xs text-accent tracking-widest uppercase mb-4 text-center">
            quick question
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12 leading-tight">
            {current.question}
          </h2>

          {/* Slider options */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((val) => {
              const isLeft = val <= 2;
              const isRight = val >= 4;
              const isMid = val === 3;
              const opacity = isLeft
                ? 1 - (val - 1) * 0.15
                : isRight
                ? 1 - (5 - val) * 0.15
                : 1;

              return (
                <button
                  key={val}
                  onClick={() => handleAnswer(val)}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border border-border bg-surface hover:border-accent hover:bg-surface transition-all duration-150 group"
                >
                  <span className="text-xl">
                    {val <= 2 ? current.leftIcon : val >= 4 ? current.rightIcon : "⚖️"}
                  </span>
                  <div className="flex-1 text-left">
                    <div className="font-sans text-sm text-text group-hover:text-accent transition-colors">
                      {isMid
                        ? "somewhere in between"
                        : isLeft
                        ? val === 1
                          ? `definitely ${current.left}`
                          : `leaning ${current.left}`
                        : val === 5
                        ? `definitely ${current.right}`
                        : `leaning ${current.right}`}
                    </div>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-muted group-hover:bg-accent transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {saving && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-accent animate-bounce" />
            <span className="font-mono text-sm text-text-muted">setting up your taste profile...</span>
          </div>
        </div>
      )}
    </div>
  );
}
