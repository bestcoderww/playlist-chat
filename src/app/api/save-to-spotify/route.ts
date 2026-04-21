import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { savePlaylistToSpotify } from "@/lib/spotify";
import type { Track } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tracks, playlistName } = await req.json();
    if (!tracks?.length) {
      return NextResponse.json({ error: "No tracks to save" }, { status: 400 });
    }

    const url = await savePlaylistToSpotify(
      tracks as Track[],
      playlistName ?? "Playlist Chat Export",
      session.accessToken
    );

    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("Save to Spotify error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to save playlist" },
      { status: 500 }
    );
  }
}
