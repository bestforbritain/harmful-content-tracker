import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { platformLabels } from "@/lib/platforms";
import { format } from "date-fns";
import { Calendar, Globe, ExternalLink, ArrowLeft, Tag } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } } },
  });

  if (!post) return { title: "Not Found" };

  const title =
    post.metaTitle ||
    post.contentText?.substring(0, 60) ||
    `Harmful content on ${platformLabels[post.platform]}`;
  const description =
    post.metaDescription ||
    post.contentText?.substring(0, 160) ||
    `Tagged: ${post.tags.map((t) => t.tag.name).join(", ")}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Harmful Content Tracker`,
      description,
      images: post.screenshotUrl || post.metaImage
        ? [{ url: post.screenshotUrl || post.metaImage || "" }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id, status: "PUBLISHED" },
    include: { tags: { include: { tag: true } } },
  });

  if (!post) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/repository"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy mb-6"
      >
        <ArrowLeft size={16} />
        Back to Repository
      </Link>

      <div className="bg-card-bg border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-navy text-white px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-white/70 mb-1">
            <span>{platformLabels[post.platform]}</span>
            <span>&middot;</span>
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              Found {format(post.dateFound, "d MMMM yyyy")}
            </span>
            {post.datePosted && (
              <>
                <span>&middot;</span>
                <span>
                  Posted {format(post.datePosted, "d MMMM yyyy")}
                </span>
              </>
            )}
          </div>
          <h1 className="text-xl font-bold">
            {post.metaTitle ||
              post.contentText?.substring(0, 100) ||
              "Harmful Content"}
          </h1>
        </div>

        <div className="p-6 space-y-6">
          {/* Embed or screenshot */}
          {post.embedHtml ? (
            <div className="border border-border rounded-lg p-4 bg-gray-50">
              <p className="text-xs text-muted mb-2 flex items-center gap-1">
                <Globe size={12} />
                Archived embed preview (content may no longer be live)
              </p>
              <div
                dangerouslySetInnerHTML={{ __html: post.embedHtml }}
              />
            </div>
          ) : null}

          {(post.screenshotUrl || post.metaImage) && (
            <div>
              <h2 className="text-sm font-semibold text-muted mb-2">
                Screenshot / Preview
              </h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.screenshotUrl || post.metaImage || ""}
                alt="Content screenshot"
                className="max-w-full rounded-lg border border-border"
              />
            </div>
          )}

          {/* Content text */}
          {post.contentText && (
            <div>
              <h2 className="text-sm font-semibold text-muted mb-2">
                Content Text
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                {post.contentText}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <h2 className="text-sm font-semibold text-muted mb-2 flex items-center gap-1">
              <Tag size={14} />
              Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((pt) => (
                <Link
                  key={pt.tag.id}
                  href={`/repository?tag=${encodeURIComponent(pt.tag.name)}`}
                  className="px-3 py-1 rounded-full text-sm font-medium text-white hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: pt.tag.color }}
                >
                  {pt.tag.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Attribution */}
          {post.attribution && (
            <div>
              <h2 className="text-sm font-semibold text-muted mb-2">
                Attribution
              </h2>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm">
                {post.attribution}
              </div>
            </div>
          )}

          {/* Researcher notes */}
          {post.notes && (
            <div>
              <h2 className="text-sm font-semibold text-muted mb-2">
                Researcher Notes
              </h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm whitespace-pre-wrap">
                {post.notes}
              </div>
            </div>
          )}

          {/* Original link */}
          <div className="border-t border-border pt-4">
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-navy hover:text-navy-dark font-medium"
            >
              <ExternalLink size={16} />
              View original post (may have been removed)
            </a>
            <p className="text-xs text-muted mt-1">
              Note: Viewing the original post may drive engagement to harmful
              content. Screenshots are provided above where available.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
