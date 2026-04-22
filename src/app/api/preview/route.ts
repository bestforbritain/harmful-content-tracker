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

// Divide a large integer (as a decimal string) by a regular number using
// long division — avoids BigInt which requires ES2020 TypeScript target.
function divideIntString(numStr: string, divisor: number): number {
  let remainder = 0;
  let result = "";
  for (const ch of numStr) {
    remainder = remainder * 10 + parseInt(ch, 10);
    result += Math.floor(remainder / divisor);
    remainder = remainder % divisor;
  }
  const trimmed = result.replace(/^0+/, "") || "0";
  return parseInt(trimmed, 10);
}

// Extract date from TikTok video ID — TikTok uses snowflake IDs where the
// upper 32 bits are a Unix timestamp in seconds, giving exact creation date.
// Uses string long-division to avoid BigInt (requires ES2020 TypeScript target).
function dateFromTikTokId(url: string): string | null {
  try {
    const match = url.match(/\/video\/(\d+)/);
    if (!match) return null;
    const ts = divideIntString(match[1], 4294967296); // 2^32
    const date = new Date(ts * 1000);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

// Use TikTok's official oEmbed endpoint — works from any server, no auth needed
async function fetchTikTokData(url: string) {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();

    const authorName = data.author_name || null;
    const caption = data.title || null;
    const image = data.thumbnail_url || null;

    // Derive posting date from the video ID (snowflake timestamp in upper 32 bits)
    const datePosted = dateFromTikTokId(url);

    return {
      title: authorName ? `${authorName} on TikTok` : null,
      description: caption,
      image,
      embedHtml: data.html || null,
      contentText: caption,
      datePosted,
    };
  } catch {
    return null;
  }
}

// Decode HTML entities in strings (e.g. &amp; → &, &#064; → @)
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

// Parse a date from Instagram's description format:
// "123 likes, 45 comments - username on January 14, 2026: ..."
function parseInstagramDate(description: string | null): string | null {
  if (!description) return null;
  // Match patterns like "on January 14, 2026" or "on 14 January 2026"
  const match = description.match(
    /on\s+(\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+\w+\s+\d{4})/i
  );
  if (match) {
    const parsed = new Date(match[1]);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }
  }
  return null;
}

// Fetch Instagram data using facebookexternalhit UA (Meta's own crawler)
// Instagram blocks Googlebot from cloud IPs but is more permissive with
// its own crawler. Falls back to extracting OG tags from the HTML response.
async function fetchInstagramData(url: string) {
  try {
    // Clean URL — strip tracking params
    const cleanUrl = url.split("?")[0];

    // Try with facebookexternalhit UA — Instagram/Meta's own crawler
    const res = await fetch(cleanUrl, {
      headers: {
        "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Check if we got a real page with OG tags (not a login wall)
    if (!html.includes('og:image') && !html.includes('og:title')) {
      return null;
    }

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

    const rawTitle = getMetaContent("og:title") || getMetaContent("twitter:title");
    const rawDescription =
      getMetaContent("og:description") ||
      getMetaContent("twitter:description") ||
      getMetaContent("description");
    const rawImage = getMetaContent("og:image") || getMetaContent("twitter:image");

    const title = rawTitle ? decodeHtmlEntities(rawTitle) : null;
    const description = rawDescription ? decodeHtmlEntities(rawDescription) : null;
    const image = rawImage ? decodeHtmlEntities(rawImage) : null;

    // Parse date from description text ("username on January 14, 2026: ...")
    const datePosted = parseInstagramDate(description);

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

// Extract a numeric Facebook object ID from various URL formats:
// /reel/123, /video/123, /watch?v=123, /permalink.php?story_fbid=123&id=456, /photo/123
function extractFacebookId(url: string): string | null {
  const patterns = [
    /\/reel\/(\d+)/,
    /\/video\/(\d+)/,
    /\/watch[/?].*[?&]v=(\d+)/,
    /story_fbid=(\d+)/,
    /\/photo\/(\d+)/,
    /\/posts\/(\d+)/,
    /\/videos\/(\d+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Use the Graph API to fetch created_time for a public Facebook object.
// Uses an app-level token (APP_ID|APP_SECRET) — no user OAuth needed.
async function fetchFacebookDate(objectId: string): Promise<string | null> {
  const appId = process.env.FB_APP_ID?.trim();
  const appSecret = process.env.FB_APP_SECRET?.trim();
  if (!appId || !appSecret) return null;

  try {
    const token = `${appId}|${appSecret}`;
    const res = await fetch(
      `https://graph.facebook.com/v22.0/${objectId}?fields=created_time&access_token=${token}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    console.log(`[FB Graph] ID=${objectId} status=${res.status}`, JSON.stringify(data));
    if (!res.ok || data.error) return null;
    if (!data.created_time) return null;
    const parsed = new Date(data.created_time);
    if (isNaN(parsed.getTime())) return null;
    return parsed.toISOString().split("T")[0];
  } catch (e) {
    console.error("[FB Graph] fetch failed:", e);
    return null;
  }
}

// Fetch Facebook data using facebookexternalhit UA — Meta whitelists its own
// crawler from any IP, so this works reliably from Vercel's servers.
async function fetchFacebookData(url: string) {
  try {
    const cleanUrl = url.split("?")[0];

    // Fetch OG tags and Graph API date in parallel
    const objectId = extractFacebookId(url);
    const [res, datePosted] = await Promise.all([
      fetch(cleanUrl, {
        headers: {
          "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
      }),
      objectId ? fetchFacebookDate(objectId) : Promise.resolve(null),
    ]);

    if (!res.ok) return null;
    const html = await res.text();
    if (!html.includes("og:image") && !html.includes("og:title")) return null;

    const getMetaContent = (property: string): string | null => {
      const patterns = [
        new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"),
        new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, "i"),
        new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) return match[1];
      }
      return null;
    };

    const title = decodeHtmlEntities(getMetaContent("og:title") || getMetaContent("twitter:title") || "");
    const description = decodeHtmlEntities(
      getMetaContent("og:description") || getMetaContent("twitter:description") || getMetaContent("description") || ""
    );
    const image = decodeHtmlEntities(getMetaContent("og:image") || getMetaContent("twitter:image") || "");

    return {
      title: title || null,
      description: description || null,
      image: image || null,
      embedHtml: null,
      contentText: description || null,
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

    const rawTitle =
      getMetaContent("og:title") ||
      getMetaContent("twitter:title") ||
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ||
      null;
    const rawDescription =
      getMetaContent("og:description") ||
      getMetaContent("twitter:description") ||
      getMetaContent("description");
    const rawImage =
      getMetaContent("og:image") || getMetaContent("twitter:image");

    // Decode HTML entities — meta tag values often contain &amp; etc.
    const title = rawTitle ? decodeHtmlEntities(rawTitle) : null;
    const description = rawDescription ? decodeHtmlEntities(rawDescription) : null;
    const image = rawImage ? decodeHtmlEntities(rawImage) : null;

    // Try to extract a published date from meta tags
    let datePosted: string | null = null;
    const rawDate =
      getMetaContent("article:published_time") ||
      getMetaContent("og:article:published_time") ||
      getMetaContent("date") ||
      getMetaContent("publish_date") ||
      getMetaContent("DC.date.issued");
    if (rawDate) {
      const parsed = new Date(decodeHtmlEntities(rawDate));
      if (!isNaN(parsed.getTime())) {
        datePosted = parsed.toISOString().split("T")[0];
      }
    }

    // For Instagram, parse date from description text (no structured date meta)
    if (!datePosted) {
      const descForDate = rawDescription ? decodeHtmlEntities(rawDescription) : null;
      const instagramDate = parseInstagramDate(descForDate);
      if (instagramDate) datePosted = instagramDate;
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
  } else if (platform === Platform.INSTAGRAM) {
    metadata = await fetchInstagramData(url);
  } else if (platform === Platform.TIKTOK) {
    metadata = await fetchTikTokData(url);
  } else if (platform === Platform.FACEBOOK) {
    metadata = await fetchFacebookData(url);
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
