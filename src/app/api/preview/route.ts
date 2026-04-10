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

    // Extract tweet text from the blockquote in the embed HTML
    let contentText: string | null = null;
    if (data.html) {
      // The oEmbed HTML has structure: <blockquote><p>TWEET TEXT</p> &mdash; Author (@handle) <a href="...">Date</a></blockquote>
      const paragraphMatch = data.html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (paragraphMatch) {
        contentText = paragraphMatch[1]
          .replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, "$1") // keep link text
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]+>/g, "") // strip remaining HTML
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
      }
    }

    // Extract date from the embed HTML - typically in the last <a> tag's text
    let datePosted: string | null = null;
    if (data.html) {
      const dateMatch = data.html.match(
        /(\w+ \d{1,2}, \d{4})<\/a>\s*<\/blockquote>/i
      );
      if (dateMatch) {
        const parsed = new Date(dateMatch[1]);
        if (!isNaN(parsed.getTime())) {
          datePosted = parsed.toISOString().split("T")[0];
        }
      }
    }

    return {
      title: data.author_name ? `${data.author_name} on X` : null,
      description: contentText,
      image: null,
      embedHtml: data.html || null,
      contentText,
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

  // For Twitter, try oEmbed first for content/embed, then OG for the image
  if (platform === Platform.TWITTER) {
    const twitterData = await fetchTwitterEmbed(url);
    const ogData = await fetchOpenGraph(url);

    if (twitterData || ogData) {
      metadata = {
        title: twitterData?.title || ogData?.title || null,
        description: twitterData?.description || ogData?.description || null,
        image: resolveImageUrl(ogData?.image || twitterData?.image || null, url),
        embedHtml: twitterData?.embedHtml || null,
        contentText: twitterData?.contentText || ogData?.contentText || null,
        datePosted: twitterData?.datePosted || ogData?.datePosted || null,
      };
    }
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
