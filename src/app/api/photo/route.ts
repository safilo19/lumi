import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// Free, no-key image search via the Openverse API (openly-licensed media).
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Missing search term." }, { status: 400 });
  try {
    const api = new URL("https://api.openverse.org/v1/images/");
    api.searchParams.set("q", q);
    api.searchParams.set("page_size", "1");
    api.searchParams.set("mature", "false");
    const res = await fetch(api, {
      headers: { "User-Agent": "Lumi/1.0 (study notes app)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      results?: { url?: string; title?: string; creator?: string }[];
    };
    const hit = data.results?.[0];
    if (!hit?.url) {
      return NextResponse.json({ error: "No image found." }, { status: 404 });
    }
    return NextResponse.json({
      url: hit.url,
      alt: hit.title || q,
      attribution: hit.creator ? `${hit.title ?? q} by ${hit.creator}` : (hit.title ?? q),
    });
  } catch {
    return NextResponse.json({ error: "Image search failed." }, { status: 502 });
  }
}
