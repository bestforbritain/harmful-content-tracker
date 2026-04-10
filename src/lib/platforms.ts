import { Platform } from "@/generated/prisma/enums";

export function detectPlatform(url: string): Platform {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes("twitter.com") || hostname.includes("x.com"))
    return Platform.TWITTER;
  if (hostname.includes("facebook.com") || hostname.includes("fb.com"))
    return Platform.FACEBOOK;
  if (hostname.includes("tiktok.com")) return Platform.TIKTOK;
  if (hostname.includes("instagram.com")) return Platform.INSTAGRAM;
  if (hostname.includes("youtube.com") || hostname.includes("youtu.be"))
    return Platform.YOUTUBE;
  if (hostname.includes("reddit.com")) return Platform.REDDIT;
  if (hostname.includes("threads.net")) return Platform.THREADS;
  return Platform.OTHER;
}

export const platformLabels: Record<Platform, string> = {
  TWITTER: "X / Twitter",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  INSTAGRAM: "Instagram",
  YOUTUBE: "YouTube",
  REDDIT: "Reddit",
  THREADS: "Threads",
  OTHER: "Other",
};

export const platformColors: Record<Platform, string> = {
  TWITTER: "#1DA1F2",
  FACEBOOK: "#1877F2",
  TIKTOK: "#000000",
  INSTAGRAM: "#E4405F",
  YOUTUBE: "#FF0000",
  REDDIT: "#FF4500",
  THREADS: "#000000",
  OTHER: "#6B7280",
};
