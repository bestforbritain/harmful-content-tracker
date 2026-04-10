"use client";

import Link from "next/link";
import { format } from "date-fns";
import { platformLabels } from "@/lib/platforms";
import { Platform } from "@/generated/prisma/enums";
import {
  ExternalLink,
  Calendar,
  Globe,
  AlertTriangle,
} from "lucide-react";

type PostWithTags = {
  id: string;
  url: string;
  platform: Platform;
  contentText: string | null;
  screenshotUrl: string | null;
  metaImage: string | null;
  metaTitle: string | null;
  dateFound: string;
  datePosted: string | null;
  attribution: string | null;
  tags: Array<{ tag: { id: string; name: string; color: string } }>;
};

const platformIcons: Record<Platform, string> = {
  TWITTER: "𝕏",
  FACEBOOK: "f",
  TIKTOK: "♪",
  INSTAGRAM: "📷",
  YOUTUBE: "▶",
  REDDIT: "r/",
  THREADS: "@",
  OTHER: "🌐",
};

export default function PostCard({ post }: { post: PostWithTags }) {
  const imageUrl = post.screenshotUrl || post.metaImage;

  return (
    <Link
      href={`/repository/${post.id}`}
      className="bg-card-bg rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
    >
      {/* Image area */}
      <div className="relative h-44 bg-gray-100 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Post preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-gray-300 flex flex-col items-center gap-2">
            <AlertTriangle size={32} />
            <span className="text-xs">No preview available</span>
          </div>
        )}
        {/* Platform badge */}
        <div className="absolute top-2 left-2 bg-navy text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
          <span>{platformIcons[post.platform]}</span>
          <span className="hidden sm:inline">
            {platformLabels[post.platform]}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Title or content preview */}
        <p className="text-sm text-foreground line-clamp-2 mb-2 flex-1">
          {post.metaTitle || post.contentText || post.url}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {post.tags.slice(0, 4).map((pt) => (
            <span
              key={pt.tag.id}
              className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: pt.tag.color }}
            >
              {pt.tag.name}
            </span>
          ))}
          {post.tags.length > 4 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
              +{post.tags.length - 4}
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {format(
              new Date(post.datePosted || post.dateFound),
              "d MMM yyyy"
            )}
          </span>
          {post.attribution && (
            <span className="flex items-center gap-1">
              <Globe size={12} />
              {post.attribution}
            </span>
          )}
          <ExternalLink size={12} />
        </div>
      </div>
    </Link>
  );
}
