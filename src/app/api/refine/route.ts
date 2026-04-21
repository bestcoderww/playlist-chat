// src/app/api/refine/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { parseIntent, describeFilterChange } from "@/lib/parseIntent";
import { generatePlaylist } from "@/lib/spotify";
import type { PlaylistFilter } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { instruction, currentFilter } = await req.json();
    if (!instruction) return NextResponse.json({ error: "No instruction" }, { status: 400 });

    const prevFilter = currentFilter as any;
    const newFilter = await parseIntent(instruction, prevFilter);

    // Check if this is purely additive (just song requests, nothing else changed)
    const newAny = newFilter as any;
    const isAdditive = newAny.song_requests?.length > 0 &&
      prevFilter?.mood === newAny.mood &&
      prevFilter?.energy === newAny.energy &&
      prevFilter?.popularity === newAny.popularity &&
      JSON.stringify((prevFilter?.artist_seeds ?? []).sort()) ===
        JSON.stringify((newAny.artist_seeds ?? []).sort());

    let tracks;
    if (isAdditive) {
      // PURE additive: only resolve song_requests, no graph, no backfill
      const { findSpecificSongDirect } = await import("@/lib/spotify");
      tracks = [];
      for (const req of newAny.song_requests) {
        const result = await findSpecificSongDirect(req.title, req.artist, session.accessToken);
        if (result) tracks.push(result);
      }
      console.log("[refine] ADDITIVE mode: resolved", tracks.length, "of", newAny.song_requests.length, "specific songs");
    } else {
      tracks = await generatePlaylist(newFilter, session.accessToken);
    }

    const changeSummary = describeFilterChange(prevFilter, newFilter);

    return NextResponse.json({ tracks, filter: newFilter, changeSummary, additive: isAdditive });
  } catch (err: any) {
    console.error("Refine API error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to refine playlist" },
      { status: 500 }
    );
  }
}
