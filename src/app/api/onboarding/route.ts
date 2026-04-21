// src/app/api/onboarding/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { prefs } = await req.json();

    if (!prefs) return NextResponse.json({ ok: true });

    // Only save if supabase is configured
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      session?.user
    ) {
      const { saveOnboardingPrefs } = await import("@/lib/supabase");
      const userId = (session.user as any).id ?? session.user.email ?? "anonymous";
      await saveOnboardingPrefs(userId, prefs);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Onboarding save error:", err);
    return NextResponse.json({ ok: true }); // non-fatal
  }
}
