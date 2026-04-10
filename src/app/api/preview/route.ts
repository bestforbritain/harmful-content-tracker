import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { detectPlatform } from "@/lib/platforms";
import { Platform } from "@/generated/prisma/enums";

async function fetchTwitterEmbed(url: string) {
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.author_name ? `${data.author_name} on X` : null,
      description: null,
      image: null,
      embedHtml: data.html || null,
    };
  } catch {
    return null;
  }
}

async function fetchOpenGraph(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; HarmfulContentTracker/1.0; +https://bestforbritain.org)",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const html = await res.text();

    const getMetaContent = (property: string): string | null => {
      const patterns = [
        new RegExp(
          `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`,
          "i"
        ),
        new RegExp(
          `<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`,
          "i"
        ),
        new RegExp(
          `<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`,
          "i"
        ),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) return match[1];
      }
      return null;
    };

    const title =
      getMetaContent("og:title") ||
      getMetaContent("twitter:title") ||
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ||
      null;
    const description =
      getMetaContent("og:description") ||
      getMetaContent("twitter:description") ||
      getMetaContent("description");
    const image =
      getMetaContent("og:image") || getMetaContent("twitter:image");

    return { title, description, image, embedHtml: null };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await request.json();
  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  const platform = detectPlatform(url);

  let metadata = null;
  if (platform === Platform.TWITTER) {
    metadata = await fetchTwitterEmbed(url);
  }

  if (!metadata) {
    metadata = await fetchOpenGraph(url);
  }

  return NextResponse.json({
    platform,
    metadata: metadata || {
      title: null,
      description: null,
      image: null,
      embedHtml: null,
    },
  });
}
