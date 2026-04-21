// src/lib/supabase.ts

function getClient(key: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !key || url === "your_supabase_project_url") return null;
  const { createClient } = require("@supabase/supabase-js");
  return createClient(url, key);
}

export async function saveOnboardingPrefs(
  spotifyUserId: string,
  prefs: Record<string, number>
) {
  const client = getClient(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
  if (!client) return;
  const { error } = await client.from("onboarding_prefs").upsert({
    spotify_user_id: spotifyUserId,
    prefs,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error("Supabase save error:", error);
}

export async function getOnboardingPrefs(spotifyUserId: string) {
  const client = getClient(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
  if (!client) return null;
  const { data } = await client
    .from("onboarding_prefs")
    .select("prefs")
    .eq("spotify_user_id", spotifyUserId)
    .single();
  return data?.prefs ?? null;
}
