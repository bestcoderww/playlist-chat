import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { parseIntent } from "@/lib/parseIntent";
import { generatePlaylist } from "@/lib/spotify";
import { getOnboardingPrefs } from "@/lib/supabase";
import type { OnboardingPreferences } from "@/types";

function onboardingToBaseFilter(prefs: OnboardingPreferences) {
  return {
    popularity: prefs.mainstream > 3 ? "higher" : prefs.mainstream < 3 ? "lower" : "mixed",
    vocals: prefs.vocals > 3 ? "any" : "any",
    genre_bias: prefs.instrumentation > 3 ? ["synth-pop", "electronic"] : ["indie rock", "guitar pop"],
    energy: prefs.energy > 3 ? "medium-high" : prefs.energy < 3 ? "medium-low" : "medium",
  } as const;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, userId } = await req.json();
    if (!prompt) return NextResponse.json({ error: "No prompt" }, { status: 400 });

    // Get onboarding prefs if available
    let baseContext = "";
    if (userId) {
      try {
        const prefs = await getOnboardingPrefs(userId);
        if (prefs) {
          const base = onboardingToBaseFilter(prefs);
          baseContext = `User prefers: ${JSON.stringify(base)}. `;
        }
      } catch {}
    }

    const filter = await parseIntent(baseContext + prompt);
    const tracks = await generatePlaylist(filter, session.accessToken);

    return NextResponse.json({ tracks, filter });
  } catch (err: any) {
    console.error("Playlist API error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to generate playlist" },
      { status: 500 }
    );
  }
}
