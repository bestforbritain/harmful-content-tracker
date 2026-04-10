import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { detectPlatform } from "@/lib/platforms";
import { Platform } from "@/generated/prisma/enums";

// Use fxtwitter.com API to get tweet data — works reliably from any server
// unlike direct X.com fetches which block cloud IPs
async function fetchTwitterData(url: string) {
  try {
    // Extract the tweet path from the URL
    const parsed = new URL(url);
    const fxUrl = `https://api.fxtwitter.com${parsed.pathname}`;
    const res = await fetch(fxUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    const tweet = data.tweet;
    if (!tweet) return null;

    // Get the best image: media image > author avatar
    let image: string | null = null;
    if (tweet.media?.photos?.length) {
      image = tweet.media.photos[0].url;
    } else if (tweet.media?.videos?.length) {
      image = tweet.media.videos[0].thumbnail_url;
    } else if (tweet.author?.avatar_url) {
      image = tweet.author.avatar_url;
    }

    // Get the oEmbed HTML too
    let embedHtml: string | null = null;
    try {
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
      const oembedRes = await fetch(oembedUrl, { signal: AbortSignal.timeout(10000) });
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        embedHtml = oembedData.html || null;
      }
    } catch {
      // oEmbed failed, that's okay
    }

    // Parse date
    let datePosted: string | null = null;
    if (tweet.created_at) {
      const parsed = new Date(tweet.created_at);
      if (!isNaN(parsed.getTime())) {
        datePosted = parsed.toISOString().split("T")[0];
      }
    } else if (tweet.created_timestamp) {
      const parsed = new Date(Number(tweet.created_timestamp) * 1000);
      if (!isNaN(parsed.getTime())) {
        datePosted = parsed.toISOString().split("T")[0];
      }
    }

    const authorName = tweet.author?.name || tweet.author?.screen_name;

    return {
      title: authorName ? `${authorName} on X` : null,
      description: tweet.text || null,
      image,
      embedHtml,
      contentText: tweet.text || null,
      datePosted,
    };
  } catch {
    return null;
  }
}

async function fetchOpenGraph(url: string) {
  try {
    // Use a bot-like user agent — platforms like X only serve OG meta tags
    // to recognised crawlers, returning a JS-only shell to other agents
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
      redirect: "follow",
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

    // Try to extract a published date from meta tags
    let datePosted: string | null = null;
    const rawDate =
      getMetaContent("article:published_time") ||
      getMetaContent("og:article:published_time") ||
      getMetaContent("date") ||
      getMetaContent("publish_date") ||
      getMetaContent("DC.date.issued");
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        datePosted = parsed.toISOString().split("T")[0];
      }
    }

    return {
      title,
      description,
      image,
      embedHtml: null,
      contentText: description,
      datePosted,
    };
  } catch {
    return null;
  }
}

function resolveImageUrl(image: string | null, baseUrl: string): string | null {
  if (!image) return null;
  // Already absolute
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  // Protocol-relative
  if (image.startsWith("//")) return `https:${image}`;
  // Relative — resolve against the base URL
  try {
    return new URL(image, baseUrl).toString();
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
    metadata = await fetchTwitterData(url);
  }

  if (!metadata) {
    const ogData = await fetchOpenGraph(url);
    if (ogData) {
      metadata = {
        ...ogData,
        image: resolveImageUrl(ogData.image, url),
      };
    }
  }

  return NextResponse.json({
    platform,
    metadata: metadata || {
      title: null,
      description: null,
      image: null,
      embedHtml: null,
      contentText: null,
      datePosted: null,
    },
  });
}
